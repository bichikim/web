/* eslint-disable max-lines -- Rendering and playback lifecycle share one player boundary. */

import {composeParameterGlue} from '../deformation/parameter-glue'
import {
  Application,
  type ColorMatrix,
  ColorMatrixFilter,
  Container,
  MaskFilter,
  Matrix,
  MeshSimple,
  type Renderer,
  RenderTexture,
  Sprite,
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
  /** Removes inertia at the current input pose without changing timeline time. */
  resetPhysics(): void
  seek(time: number): void
  setMotion(motionId: string): boolean
  setParameterValues(values: PuppetParameterValueMap): void
  /** Enables inertia; when disabled, physics outputs follow their static input equilibrium. */
  setPhysicsPreview(enabled: boolean): void
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
  readonly physicsPreview?: boolean
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
  readonly filter: MaskFilter
  readonly meshes: ReadonlyArray<RuntimePartMaskMesh>
  readonly sprite: Sprite
  readonly texture: RenderTexture
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
          root.addChild(runtimePart.mask.sprite)
          runtimePart.mask.filter.inverse = plan.properties.invertedMask
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
  const filters: Array<ColorMatrixFilter | MaskFilter> = []
  if (hasColorEffect) {
    const colorFilter = runtimePart.colorFilter ?? new ColorMatrixFilter()
    runtimePart.colorFilter = colorFilter
    colorFilter.matrix = createColorMatrix(properties.multiplyColor, properties.screenColor)
    colorFilter.blendMode = 'normal'
    filters.push(colorFilter)
  }
  if (runtimePart.mask !== undefined) {
    filters.push(runtimePart.mask.filter)
  }
  const composite = filters.at(-1)
  if (composite !== undefined) {
    // Blend the completed layer against the scene, never its transparent intermediate.
    runtimePart.mesh.blendMode = 'normal'
    composite.blendMode = properties.blendMode
  }
  runtimePart.mesh.filters = filters.length > 0 ? filters : null
}

const MILLISECONDS_PER_SECOND = 1000
const MINIMUM_MASK_RESOLUTION = 0.01
const MASK_TEXTURE_BLOCK_SIZE = 64
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
      container.addChild(mask.sprite)
      mask.filter.inverse = sourcePlan.invertedMask
      mesh.filters = [mask.filter]
    }
    container.addChild(mesh)
    return [{mask, mesh, sourcePartId: sourcePlan.partId}]
  })

  const texture = RenderTexture.create({antialias: true, dynamic: true, height: 1, width: 1})
  const sprite = new Sprite(texture)
  sprite.renderable = false
  const filter = new MaskFilter({channel: 'alpha', sprite})
  return {container, filter, meshes, sprite, texture}
}

const renderRuntimeMask = (
  mask: RuntimePartMask,
  renderer: Renderer,
  resolution: number,
  vertices: MeshSimple['vertices'],
) => {
  for (const source of mask.meshes) {
    if (source.mask !== undefined) {
      renderRuntimeMask(source.mask, renderer, resolution, source.mesh.vertices)
    }
  }
  // Only the receiving mesh can display this mask; retain capacity while its bounds animate.
  const horizontal = vertices.filter((_, index) => index % 2 === 0)
  const vertical = vertices.filter((_, index) => index % 2 === 1)
  const left = Math.floor(horizontal.length > 0 ? Math.min(...horizontal) : 0)
  const top = Math.floor(vertical.length > 0 ? Math.min(...vertical) : 0)
  const width = Math.max(
    mask.texture.width,
    Math.ceil((Math.max(left + 1, ...horizontal) - left) / MASK_TEXTURE_BLOCK_SIZE) *
      MASK_TEXTURE_BLOCK_SIZE,
  )
  const height = Math.max(
    mask.texture.height,
    Math.ceil((Math.max(top + 1, ...vertical) - top) / MASK_TEXTURE_BLOCK_SIZE) *
      MASK_TEXTURE_BLOCK_SIZE,
  )
  if (
    mask.texture.width !== width ||
    mask.texture.height !== height ||
    mask.texture.source.resolution !== resolution
  ) {
    mask.texture.resize(width, height, resolution)
  }
  mask.sprite.position.set(left, top)
  renderer.render({
    clear: true,
    container: mask.container,
    target: mask.texture,
    transform: new Matrix().translate(-left, -top),
  })
}

const destroyRuntimeMask = (mask: RuntimePartMask) => {
  for (const source of mask.meshes) {
    if (source.mask !== undefined) {
      destroyRuntimeMask(source.mask)
    }
  }
  mask.sprite.destroy()
  mask.texture.destroy(true)
  mask.filter.destroy()
  mask.container.destroy({children: true})
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
      runtimePart.mask.filter.inverse = plan?.properties.invertedMask ?? false
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
      maskMesh.mask.filter.inverse =
        options.planById.get(maskMesh.sourcePartId)?.properties.invertedMask ?? false
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
  readonly settlePhysics: boolean
  readonly root: Container
  readonly time: number
}

const applyRuntimeFrame = (
  options: ApplyRuntimeFrameOptions,
): ReadonlyMap<string, PendulumState> => {
  const motionParameterValues = sampleMotionParameterValues({
    motion: options.activeMotion,
    parameters: options.document.parameters,
    parameterValues: options.parameterValues,
    time: options.time,
  })
  const physicsResult = evaluatePhysics({
    deltaTime: options.deltaTime,
    document: options.document,
    parameterValues: motionParameterValues,
    physicsState: options.physicsState,
    settle: options.settlePhysics,
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
  let physicsPreview = options.physicsPreview ?? true
  let isPlaying = true
  let elapsedTime = 0
  let isLooping = true
  let onMotionComplete: (() => void) | undefined
  let destroyed = false

  const destroy = () => {
    if (destroyed) {
      return
    }

    destroyed = true
    for (const part of partById.values()) {
      if (part.mask !== undefined) {
        destroyRuntimeMask(part.mask)
      }
      part.colorFilter?.destroy()
    }
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

  const applyFrame = (
    activeMotion: PuppetMotion | undefined,
    time: number,
    deltaTime = 0,
    settlePhysics = !physicsPreview,
  ) => {
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
      settlePhysics,
      time,
    })
    for (const part of partById.values()) {
      if (part.mask !== undefined && part.mesh.visible) {
        const resolution = Math.max(
          MINIMUM_MASK_RESOLUTION,
          application.renderer.resolution * root.scale.x,
        )
        renderRuntimeMask(part.mask, application.renderer, resolution, part.vertices)
      }
    }
  }

  const syncTicker = () => {
    if (isPlaying || (physicsPreview && (document.physics?.pendulums.length ?? 0) > 0)) {
      application.start()
    } else {
      application.stop()
    }
  }

  application.ticker.add((ticker) => {
    let completed = false

    if (isPlaying && motion !== undefined && motion.duration > 0) {
      const nextTime = elapsedTime + ticker.deltaMS / MILLISECONDS_PER_SECOND
      completed = !isLooping && nextTime >= motion.duration
      elapsedTime = isLooping ? nextTime % motion.duration : Math.min(nextTime, motion.duration)
    }

    applyFrame(motion, elapsedTime, ticker.deltaMS / MILLISECONDS_PER_SECOND)

    if (completed) {
      isPlaying = false
      syncTicker()
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

    const physicsChanged = document.physics !== nextDocument.physics
    document = nextDocument
    motion = getMotion(document, motion?.id ?? options.motionId) ?? document.motions[0]
    isLooping = true
    onMotionComplete = undefined
    if (physicsChanged) {
      physicsState = createPhysicsState(document)
      syncTicker()
    }

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
    isPlaying = true
    onMotionComplete = playbackOptions.onComplete
    application.start()
    return true
  }

  return {
    destroy,
    pause() {
      isPlaying = false
      syncTicker()
      isLooping = true
      onMotionComplete = undefined
    },
    play(playbackOptions) {
      isPlaying = true
      isLooping = playbackOptions?.loop ?? true
      onMotionComplete = playbackOptions?.onComplete
      application.start()
    },
    playMotion,
    resetPhysics() {
      applyFrame(motion, elapsedTime, 0, true)
      application.render()
    },
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
    setPhysicsPreview(enabled) {
      if (physicsPreview === enabled) {
        return
      }
      physicsPreview = enabled
      applyFrame(motion, elapsedTime, 0, true)
      application.render()
      syncTicker()
    },
    updateDocument,
  }
}
