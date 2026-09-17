/* eslint-disable max-lines -- Rendering and playback lifecycle share one player boundary. */

import {composeParameterGlue} from '../deformation/parameter-glue'
import {
  AlphaMask,
  Application,
  type ColorMatrix,
  ColorMatrixFilter,
  Container,
  MeshSimple,
  Texture,
} from 'pixi.js'

import {
  composeParameterScene,
  composeParameterVertices,
  type PuppetParameterValueMap,
  type ResolvedPartRenderProperties,
} from '../deformation'
import type {PuppetDocument, PuppetMotion} from './document'
import type {PendulumState} from './physics'
import {
  assertPreparedPuppetDocument,
  type PreparedPuppetDocument,
} from './internal/prepared-document'
import {applyMotionVertices, sampleMotionParameterValues} from './internal/motion'
import {createPhysicsState, evaluatePhysics} from './internal/physics'
import {
  canReusePartResources,
  getPartRenderPlans,
  type PartMaskRenderPlan,
  type PartRenderPlan,
} from './internal/render-plan'
import {applySceneDeformers} from './internal/scene-deformation'
import {layoutPlayerRoot} from './internal/layout-player-root'

export interface Player {
  destroy(): void
  pause(): void
  play(options?: PlayerPlaybackOptions): void
  playMotion(motionId: string, options?: PlayerPlaybackOptions): boolean
  resize(): void
  seek(time: number): void
  setMotion(motionId: string): boolean
  setParameterValues(values: PuppetParameterValueMap): void
  updateDocument(document: PreparedPuppetDocument): boolean
}

export interface PlayerPlaybackOptions {
  readonly loop?: boolean
  readonly onComplete?: () => void
}

export interface PlayerFrame {
  readonly duration: number
  readonly motionId: string | null
  readonly time: number
}

export interface CreatePlayerOptions {
  readonly canvas: HTMLCanvasElement
  readonly document: PreparedPuppetDocument
  readonly motionId?: string
  readonly onFrame?: (frame: PlayerFrame) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly resolution?: number
  readonly resizeTo?: HTMLElement
  readonly viewportPadding?: number
}

interface RuntimePart {
  colorFilter?: ColorMatrixFilter
  mask?: RuntimePartMask
  readonly mesh: MeshSimple
  readonly partId: string
  restVertices: ReadonlyArray<number>
  vertices: Float32Array
}

interface RuntimePartMaskMesh {
  readonly mask?: RuntimePartMask
  readonly mesh: MeshSimple
  readonly sourcePartId: string
}

interface RuntimePartMask {
  readonly container: Container
  readonly effect?: AlphaMask
  readonly meshes: ReadonlyArray<RuntimePartMaskMesh>
}

const updateMeshMask = (mesh: MeshSimple, mask: RuntimePartMask, inverse: boolean) => {
  if (mask.effect !== undefined) {
    mask.effect.inverse = inverse
    return
  }

  mesh.setMask({channel: 'alpha', inverse, mask: mask.container})
}

interface ApplyFrameVerticesOptions {
  readonly document: PuppetDocument
  readonly motion: PuppetMotion | undefined
  readonly parameterValues: PuppetParameterValueMap | undefined
  readonly partId: string
  readonly runtimePart: RuntimePart
  readonly time: number
}

const applyFrameVertices = (options: ApplyFrameVerticesOptions) => {
  options.runtimePart.vertices.set(
    composeParameterVertices({
      document: options.document,
      parameterValues: options.parameterValues,
      partId: options.partId,
      restVertices: options.runtimePart.restVertices,
    }),
  )
  applyMotionVertices({
    motion: options.motion,
    partId: options.partId,
    time: options.time,
    vertices: options.runtimePart.vertices,
  })
}

const applyDocumentScene = (
  plans: ReadonlyArray<PartRenderPlan>,
  partById: ReadonlyMap<string, RuntimePart>,
  root: Container,
) => {
  for (const plan of plans) {
    const runtimePart = partById.get(plan.partId)

    if (runtimePart !== undefined) {
      runtimePart.mesh.visible = plan.visible
      if (plan.render) {
        if (runtimePart.mask !== undefined) {
          root.addChild(runtimePart.mask.container)
          updateMeshMask(runtimePart.mesh, runtimePart.mask, plan.properties.invertedMask)
        }
        root.addChild(runtimePart.mesh)
      }
    }
  }
}

const colorsEqual = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  first.length === second.length && first.every((value, index) => value === second[index])

const createColorMatrix = (
  multiplyColor: readonly [number, number, number],
  screenColor: readonly [number, number, number],
): ColorMatrix => [
  multiplyColor[0] * (1 - screenColor[0]),
  0,
  0,
  0,
  screenColor[0],
  0,
  multiplyColor[1] * (1 - screenColor[1]),
  0,
  0,
  screenColor[1],
  0,
  0,
  multiplyColor[2] * (1 - screenColor[2]),
  0,
  screenColor[2],
  0,
  0,
  0,
  1,
  0,
]

const applyPartRenderProperties = (
  properties: ResolvedPartRenderProperties,
  runtimePart: RuntimePart,
) => {
  runtimePart.mesh.alpha = properties.opacity
  runtimePart.mesh.blendMode = properties.blendMode

  const hasColorEffect =
    !colorsEqual(properties.multiplyColor, [1, 1, 1]) ||
    !colorsEqual(properties.screenColor, [0, 0, 0])
  if (!hasColorEffect) {
    runtimePart.mesh.filters = null
    return
  }

  const colorFilter = runtimePart.colorFilter ?? new ColorMatrixFilter()
  runtimePart.colorFilter = colorFilter
  colorFilter.matrix = createColorMatrix(properties.multiplyColor, properties.screenColor)
  runtimePart.mesh.filters = [colorFilter]
}

const MILLISECONDS_PER_SECOND = 1000
const APPLICATION_DESTROY_OPTIONS = {
  children: true,
  context: false,
  texture: true,
  textureSource: true,
}

const createPlayerFrame = (motion: PuppetMotion | undefined, time: number): PlayerFrame => ({
  duration: motion?.duration ?? 0,
  motionId: motion?.id ?? null,
  time,
})

const getSeekTime = (motion: PuppetMotion | undefined, time: number) => {
  const clampedTime = Math.max(0, time)

  if (motion === undefined || motion.duration <= 0) {
    return clampedTime
  }

  return clampedTime <= motion.duration ? clampedTime : clampedTime % motion.duration
}

const loadTexture = async (source: string) => {
  const image = new Image()
  image.decoding = 'async'
  image.src = source
  await image.decode()

  return Texture.from(image)
}

interface InitializeRuntimePartsOptions {
  readonly document: PuppetDocument
  readonly partById: Map<string, RuntimePart>
  readonly root: Container
}

interface CreateRuntimePartMaskOptions {
  readonly document: PuppetDocument
  readonly plan: PartMaskRenderPlan
  readonly partById: ReadonlyMap<string, RuntimePart>
}

const createRuntimePartMask = (options: CreateRuntimePartMaskOptions): RuntimePartMask => {
  const container = new Container()
  const meshes = options.plan.sources.flatMap((sourcePlan) => {
    const sourcePart = options.document.parts.find((part) => part.id === sourcePlan.partId)
    const sourceRuntimePart = options.partById.get(sourcePlan.partId)
    if (sourcePart === undefined || sourceRuntimePart === undefined) {
      return []
    }

    const mesh = new MeshSimple({
      indices: new Uint32Array(sourcePart.mesh.indices),
      texture: sourceRuntimePart.mesh.texture,
      topology: 'triangle-list',
      uvs: new Float32Array(sourcePart.mesh.uvs),
      vertices: new Float32Array(sourceRuntimePart.vertices),
    })
    const mask =
      sourcePlan.mask === undefined
        ? undefined
        : createRuntimePartMask({
            document: options.document,
            partById: options.partById,
            plan: sourcePlan.mask,
          })

    if (mask !== undefined) {
      container.addChild(mask.container)
      if (mask.effect === undefined) {
        updateMeshMask(mesh, mask, sourcePlan.invertedMask)
      } else {
        mask.effect.inverse = sourcePlan.invertedMask
        mesh.addEffect(mask.effect)
      }
    }
    container.addChild(mesh)
    return [{mask, mesh, sourcePartId: sourcePlan.partId}]
  })

  const effect = new AlphaMask({mask: container})
  effect.channel = 'alpha'
  return {container, effect, meshes}
}

const initializeRuntimeParts = async (options: InitializeRuntimePartsOptions) => {
  const textureResults = await Promise.allSettled(
    options.document.parts.map((part) => loadTexture(part.texture.src)),
  )
  const failedTexture = textureResults.find(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  )

  if (failedTexture !== undefined) {
    for (const result of textureResults) {
      if (result.status === 'fulfilled') {
        result.value.destroy(true)
      }
    }

    throw failedTexture.reason
  }

  for (const [index, part] of options.document.parts.entries()) {
    const textureResult = textureResults[index]

    if (textureResult?.status !== 'fulfilled') {
      throw new Error(`Missing texture for part: ${part.id}`)
    }

    const restVertices = part.mesh.vertices
    const vertices = new Float32Array(restVertices)
    const mesh = new MeshSimple({
      indices: new Uint32Array(part.mesh.indices),
      texture: textureResult.value,
      topology: 'triangle-list',
      uvs: new Float32Array(part.mesh.uvs),
      vertices,
    })

    options.partById.set(part.id, {mesh, partId: part.id, restVertices, vertices})
  }

  const plans = getPartRenderPlans(options.document)
  const planById = new Map(plans.map((plan) => [plan.partId, plan]))
  for (const runtimePart of options.partById.values()) {
    const plan = planById.get(runtimePart.partId)
    runtimePart.mask =
      plan?.mask === undefined
        ? undefined
        : createRuntimePartMask({
            document: options.document,
            partById: options.partById,
            plan: plan.mask,
          })
    if (runtimePart.mask !== undefined) {
      if (runtimePart.mask.effect === undefined) {
        updateMeshMask(runtimePart.mesh, runtimePart.mask, plan?.properties.invertedMask ?? false)
      } else {
        runtimePart.mesh.addEffect(runtimePart.mask.effect)
      }
    }
  }

  applyDocumentScene(plans, options.partById, options.root)
}

interface UpdateRuntimeMaskOptions {
  readonly mask: RuntimePartMask
  readonly planById: ReadonlyMap<string, PartRenderPlan>
  readonly partById: ReadonlyMap<string, RuntimePart>
}

const updateRuntimeMask = (options: UpdateRuntimeMaskOptions) => {
  for (const maskMesh of options.mask.meshes) {
    const sourcePart = options.partById.get(maskMesh.sourcePartId)
    if (sourcePart !== undefined) {
      maskMesh.mesh.vertices = sourcePart.vertices
    }
    if (maskMesh.mask !== undefined) {
      updateRuntimeMask({...options, mask: maskMesh.mask})
      updateMeshMask(
        maskMesh.mesh,
        maskMesh.mask,
        options.planById.get(maskMesh.sourcePartId)?.properties.invertedMask ?? false,
      )
    }
  }
}

const getMotion = (document: PuppetDocument, motionId: string | undefined) =>
  motionId === undefined
    ? document.motions[0]
    : document.motions.find((motion) => motion.id === motionId)

interface ApplyRuntimeFrameOptions {
  readonly activeMotion: PuppetMotion | undefined
  readonly deltaTime: number
  readonly document: PuppetDocument
  readonly layoutRoot: () => void
  readonly onFrame?: (frame: PlayerFrame) => void
  readonly parameterValues?: PuppetParameterValueMap
  readonly partById: ReadonlyMap<string, RuntimePart>
  readonly physicsState: ReadonlyMap<string, PendulumState>
  readonly root: Container
  readonly time: number
}

const applyRuntimeFrame = (
  options: ApplyRuntimeFrameOptions,
): ReadonlyMap<string, PendulumState> => {
  const motionParameterValues = sampleMotionParameterValues({
    motion: options.activeMotion,
    parameterValues: options.parameterValues,
    time: options.time,
  })
  const physicsResult = evaluatePhysics({
    deltaTime: options.deltaTime,
    document: options.document,
    parameterValues: motionParameterValues,
    physicsState: options.physicsState,
  })
  const frameParameterValues = physicsResult.parameterValues
  const renderPlans = getPartRenderPlans(options.document, frameParameterValues)
  const planById = new Map(renderPlans.map((plan) => [plan.partId, plan]))

  for (const [partId, runtimePart] of options.partById) {
    applyFrameVertices({
      document: options.document,
      motion: options.activeMotion,
      parameterValues: frameParameterValues,
      partId,
      runtimePart,
      time: options.time,
    })
  }

  applySceneDeformers({
    document: {
      ...options.document,
      glue: composeParameterGlue({
        document: options.document,
        parameterValues: frameParameterValues,
      }),
      scene: composeParameterScene(options.document, frameParameterValues),
    },
    verticesByPartId: new Map(
      [...options.partById].map(([partId, runtimePart]) => [partId, runtimePart.vertices]),
    ),
  })

  for (const runtimePart of options.partById.values()) {
    runtimePart.mesh.vertices = runtimePart.vertices
    const plan = planById.get(runtimePart.partId)
    if (plan !== undefined) {
      applyPartRenderProperties(plan.properties, runtimePart)
    }
  }

  for (const runtimePart of options.partById.values()) {
    if (runtimePart.mask !== undefined) {
      updateRuntimeMask({
        mask: runtimePart.mask,
        partById: options.partById,
        planById,
      })
    }
  }

  applyDocumentScene(renderPlans, options.partById, options.root)
  options.layoutRoot()
  options.onFrame?.(createPlayerFrame(options.activeMotion, options.time))
  return physicsResult.physicsState
}

// eslint-disable-next-line max-lines-per-function
export const createPlayer = async (options: CreatePlayerOptions): Promise<Player> => {
  assertPreparedPuppetDocument(options.document)

  const application = new Application()
  const resizeTarget = options.resizeTo ?? options.canvas.parentElement

  await application.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    canvas: options.canvas,
    height: options.document.viewport.height,
    resolution: options.resolution ?? Math.min(window.devicePixelRatio, 2),
    width: options.document.viewport.width,
    ...(resizeTarget === null ? {} : {resizeTo: resizeTarget}),
  })

  const root = new Container()
  const partById = new Map<string, RuntimePart>()
  let {document} = options
  let motion = getMotion(document, options.motionId)
  let {parameterValues} = options
  let physicsState = createPhysicsState(document)
  let elapsedTime = 0
  let isLooping = true
  let onMotionComplete: (() => void) | undefined
  let destroyed = false

  const destroy = () => {
    if (destroyed) {
      return
    }

    destroyed = true
    application.destroy({removeView: false}, APPLICATION_DESTROY_OPTIONS)
  }

  try {
    await initializeRuntimeParts({document, partById, root})
    application.stage.addChild(root)
  } catch (error) {
    destroy()
    throw new Error('Puppet player resource initialization failed', {cause: error})
  }

  const layoutRoot = () => {
    layoutPlayerRoot({
      document,
      root,
      screen: application.screen,
      viewportPadding: options.viewportPadding,
    })
  }

  const applyFrame = (activeMotion: PuppetMotion | undefined, time: number, deltaTime = 0) => {
    physicsState = applyRuntimeFrame({
      activeMotion,
      deltaTime,
      document,
      layoutRoot,
      onFrame: options.onFrame,
      parameterValues,
      partById,
      physicsState,
      root,
      time,
    })
  }

  application.ticker.add((ticker) => {
    let completed = false

    if (motion !== undefined && motion.duration > 0) {
      const nextTime = elapsedTime + ticker.deltaMS / MILLISECONDS_PER_SECOND
      completed = !isLooping && nextTime >= motion.duration
      elapsedTime = isLooping ? nextTime % motion.duration : Math.min(nextTime, motion.duration)
    }

    applyFrame(motion, elapsedTime, ticker.deltaMS / MILLISECONDS_PER_SECOND)

    if (completed) {
      application.stop()
      const complete = onMotionComplete
      onMotionComplete = undefined
      complete?.()
    }
  })

  applyFrame(motion, elapsedTime)
  application.render()

  const updateDocument = (nextDocument: PreparedPuppetDocument) => {
    assertPreparedPuppetDocument(nextDocument)

    const canReuseResources = canReusePartResources(document, nextDocument)

    if (!canReuseResources) {
      return false
    }

    document = nextDocument
    motion = getMotion(document, motion?.id ?? options.motionId) ?? document.motions[0]
    isLooping = true
    onMotionComplete = undefined
    physicsState = createPhysicsState(document)

    for (const part of document.parts) {
      const runtimePart = partById.get(part.id)

      if (runtimePart !== undefined) {
        runtimePart.restVertices = part.mesh.vertices
        runtimePart.vertices = new Float32Array(runtimePart.restVertices)
        runtimePart.mesh.geometry.positions = runtimePart.vertices
        runtimePart.mesh.geometry.uvs = new Float32Array(part.mesh.uvs)
        runtimePart.mesh.geometry.indices = new Uint32Array(part.mesh.indices)
      }
    }

    elapsedTime = getSeekTime(motion, elapsedTime)
    applyFrame(motion, elapsedTime)
    application.render()

    return true
  }

  const setMotion = (motionId: string) => {
    const nextMotion = getMotion(document, motionId)

    if (nextMotion === undefined) {
      return false
    }

    if (motion?.id === nextMotion.id) {
      return true
    }

    motion = nextMotion
    elapsedTime = 0
    isLooping = true
    onMotionComplete = undefined
    applyFrame(motion, elapsedTime)
    application.render()
    return true
  }

  const playMotion = (motionId: string, playbackOptions: PlayerPlaybackOptions = {}) => {
    const nextMotion = getMotion(document, motionId)

    if (nextMotion === undefined) {
      return false
    }

    if (motion?.id === nextMotion.id) {
      elapsedTime = 0
      applyFrame(motion, elapsedTime)
      application.render()
    } else {
      setMotion(motionId)
    }

    isLooping = playbackOptions.loop ?? true
    onMotionComplete = playbackOptions.onComplete
    application.start()
    return true
  }

  return {
    destroy,
    pause() {
      application.stop()
      isLooping = true
      onMotionComplete = undefined
    },
    play(playbackOptions) {
      isLooping = playbackOptions?.loop ?? true
      onMotionComplete = playbackOptions?.onComplete
      application.start()
    },
    playMotion,
    resize() {
      application.resize()
      layoutRoot()
      application.render()
    },
    seek(time: number) {
      elapsedTime = getSeekTime(motion, time)
      applyFrame(motion, elapsedTime)
      application.render()
    },
    setMotion,
    setParameterValues(values) {
      parameterValues = values
      applyFrame(motion, elapsedTime)
      application.render()
    },
    updateDocument,
  }
}
