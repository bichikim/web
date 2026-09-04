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
  composeParameterPartProperties,
  composeParameterScene,
  composeParameterVertices,
  type PuppetParameterValueMap,
} from '../deformation'
import type {PuppetDocument, PuppetMotion} from './document'
import {
  assertPreparedPuppetDocument,
  type PreparedPuppetDocument,
} from './internal/prepared-document'
import {applyMotionVertices, sampleMotionParameterValues} from './internal/motion'
import {applySceneDeformers} from './internal/scene-deformation'
import {getScenePartStates} from './scene'

export interface Player {
  destroy(): void
  pause(): void
  play(): void
  resize(): void
  seek(time: number): void
  setParameterValues(values: PuppetParameterValueMap): void
  updateDocument(document: PreparedPuppetDocument): boolean
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
  document: PuppetDocument,
  partById: ReadonlyMap<string, RuntimePart>,
  root: Container,
  parameterValues?: PuppetParameterValueMap,
) => {
  const maskPartIds = new Set(
    document.parts.flatMap((part) => part.properties?.clippingMaskIds ?? []),
  )
  for (const state of getScenePartStates(document)) {
    const runtimePart = partById.get(state.partId)

    if (runtimePart !== undefined) {
      const properties = composeParameterPartProperties({
        document,
        parameterValues,
        partId: state.partId,
      })
      const shouldRender = !maskPartIds.has(state.partId) || properties.renderWhenUsedAsMask
      runtimePart.mesh.visible = state.visible && shouldRender
      if (shouldRender) {
        if (runtimePart.mask !== undefined) {
          root.addChild(runtimePart.mask.container)
          updateMeshMask(runtimePart.mesh, runtimePart.mask, properties.invertedMask)
        }
        root.addChild(runtimePart.mesh)
      }
    }
  }
}

const valuesEqual = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
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
  document: PuppetDocument,
  parameterValues: PuppetParameterValueMap | undefined,
  partId: string,
  runtimePart: RuntimePart,
) => {
  const properties = composeParameterPartProperties({document, parameterValues, partId})
  runtimePart.mesh.alpha = properties.opacity
  runtimePart.mesh.blendMode = properties.blendMode

  const hasColorEffect =
    !valuesEqual(properties.multiplyColor, [1, 1, 1]) ||
    !valuesEqual(properties.screenColor, [0, 0, 0])
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
const VIEWPORT_PADDING = 1
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
  return motion === undefined || clampedTime <= motion.duration
    ? clampedTime
    : clampedTime % motion.duration
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
  readonly ancestorPartIds: ReadonlySet<string>
  readonly document: PuppetDocument
  readonly partById: ReadonlyMap<string, RuntimePart>
  readonly targetPartId: string
}

const createRuntimePartMask = (
  options: CreateRuntimePartMaskOptions,
): RuntimePartMask | undefined => {
  if (options.ancestorPartIds.has(options.targetPartId)) {
    return undefined
  }

  const targetPart = options.document.parts.find((part) => part.id === options.targetPartId)
  const maskPartIds = targetPart?.properties?.clippingMaskIds ?? []
  if (maskPartIds.length === 0) {
    return undefined
  }

  const ancestorPartIds = new Set(options.ancestorPartIds)
  ancestorPartIds.add(options.targetPartId)
  const container = new Container()
  const meshes = maskPartIds.flatMap((sourcePartId) => {
    const sourcePart = options.document.parts.find((part) => part.id === sourcePartId)
    const sourceRuntimePart = options.partById.get(sourcePartId)
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
    const mask = createRuntimePartMask({
      ancestorPartIds,
      document: options.document,
      partById: options.partById,
      targetPartId: sourcePartId,
    })

    if (mask !== undefined) {
      container.addChild(mask.container)
      const inverse = composeParameterPartProperties({
        document: options.document,
        partId: sourcePartId,
      }).invertedMask
      if (mask.effect === undefined) {
        updateMeshMask(mesh, mask, inverse)
      } else {
        mask.effect.inverse = inverse
        mesh.addEffect(mask.effect)
      }
    }
    container.addChild(mesh)
    return [{mask, mesh, sourcePartId}]
  })

  const effect = meshes.some((mesh) => mesh.mask !== undefined)
    ? new AlphaMask({mask: container})
    : undefined
  if (effect !== undefined) {
    effect.channel = 'alpha'
  }
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

  for (const runtimePart of options.partById.values()) {
    runtimePart.mask = createRuntimePartMask({
      ancestorPartIds: new Set(),
      document: options.document,
      partById: options.partById,
      targetPartId: runtimePart.partId,
    })
    if (runtimePart.mask !== undefined) {
      if (runtimePart.mask.effect === undefined) {
        updateMeshMask(
          runtimePart.mesh,
          runtimePart.mask,
          composeParameterPartProperties({
            document: options.document,
            partId: runtimePart.partId,
          }).invertedMask,
        )
      } else {
        runtimePart.mesh.addEffect(runtimePart.mask.effect)
      }
    }
  }

  applyDocumentScene(options.document, options.partById, options.root)
}

interface UpdateRuntimeMaskOptions {
  readonly document: PuppetDocument
  readonly mask: RuntimePartMask
  readonly parameterValues: PuppetParameterValueMap | undefined
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
        composeParameterPartProperties({
          document: options.document,
          parameterValues: options.parameterValues,
          partId: maskMesh.sourcePartId,
        }).invertedMask,
      )
    }
  }
}

const getMotion = (document: PuppetDocument, motionId: string | undefined) =>
  motionId === undefined
    ? document.motions[0]
    : document.motions.find((motion) => motion.id === motionId)

const canReuseRuntimeParts = (document: PuppetDocument, nextDocument: PuppetDocument) => {
  const maskPartIds = new Set(
    nextDocument.parts.flatMap((part) => part.properties?.clippingMaskIds ?? []),
  )
  return (
    nextDocument.parts.length === document.parts.length &&
    nextDocument.parts.every((part, index) => {
      const previousPart = document.parts[index]
      return (
        previousPart?.id === part.id &&
        previousPart.texture.src === part.texture.src &&
        (!maskPartIds.has(part.id) ||
          (valuesEqual(previousPart.mesh.indices, part.mesh.indices) &&
            valuesEqual(previousPart.mesh.uvs, part.mesh.uvs))) &&
        (previousPart.properties?.clippingMaskIds ?? []).join('\0') ===
          (part.properties?.clippingMaskIds ?? []).join('\0')
      )
    })
  )
}

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
    resolution: Math.min(window.devicePixelRatio, 2),
    width: options.document.viewport.width,
    ...(resizeTarget === null ? {} : {resizeTo: resizeTarget}),
  })

  const root = new Container()
  const partById = new Map<string, RuntimePart>()
  let {document} = options
  let motion = getMotion(document, options.motionId)
  let {parameterValues} = options
  let elapsedTime = 0
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
    const viewportPadding = Math.max(0, options.viewportPadding ?? 0)
    const viewportWidth = document.viewport.width * (1 + viewportPadding * 2)
    const viewportHeight = document.viewport.height * (1 + viewportPadding * 2)
    const scale =
      Math.min(
        application.screen.width / viewportWidth,
        application.screen.height / viewportHeight,
      ) * VIEWPORT_PADDING

    root.scale.set(scale)
    root.position.set(
      (application.screen.width - document.viewport.width * scale) / 2,
      (application.screen.height - document.viewport.height * scale) / 2,
    )
  }

  const applyFrame = (activeMotion: PuppetMotion | undefined, time: number) => {
    const frameParameterValues = sampleMotionParameterValues({
      motion: activeMotion,
      parameterValues,
      time,
    })

    for (const [partId, runtimePart] of partById) {
      applyFrameVertices({
        document,
        motion: activeMotion,
        parameterValues: frameParameterValues,
        partId,
        runtimePart,
        time,
      })
    }

    applySceneDeformers({
      document: {...document, scene: composeParameterScene(document, frameParameterValues)},
      verticesByPartId: new Map(
        [...partById].map(([partId, runtimePart]) => [partId, runtimePart.vertices]),
      ),
    })

    for (const runtimePart of partById.values()) {
      runtimePart.mesh.vertices = runtimePart.vertices
      applyPartRenderProperties(document, frameParameterValues, runtimePart.partId, runtimePart)
    }

    for (const runtimePart of partById.values()) {
      if (runtimePart.mask !== undefined) {
        updateRuntimeMask({
          document,
          mask: runtimePart.mask,
          parameterValues: frameParameterValues,
          partById,
        })
      }
    }

    applyDocumentScene(document, partById, root, frameParameterValues)
    layoutRoot()
    options.onFrame?.(createPlayerFrame(activeMotion, time))
  }

  application.ticker.add((ticker) => {
    if (motion !== undefined) {
      elapsedTime = (elapsedTime + ticker.deltaMS / MILLISECONDS_PER_SECOND) % motion.duration
    }

    applyFrame(motion, elapsedTime)
  })

  applyFrame(motion, elapsedTime)
  application.render()

  const updateDocument = (nextDocument: PreparedPuppetDocument) => {
    assertPreparedPuppetDocument(nextDocument)

    const canReuseResources = canReuseRuntimeParts(document, nextDocument)

    if (!canReuseResources) {
      return false
    }

    document = nextDocument
    motion = getMotion(document, options.motionId)

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

    applyDocumentScene(document, partById, root)
    elapsedTime = getSeekTime(motion, elapsedTime)
    applyFrame(motion, elapsedTime)
    application.render()

    return true
  }

  return {
    destroy,
    pause() {
      application.stop()
    },
    play() {
      application.start()
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
    setParameterValues(values) {
      parameterValues = values
      applyFrame(motion, elapsedTime)
      application.render()
    },
    updateDocument,
  }
}
