import type {PlayerViewCamera} from '../view-camera'
import 'pixi.js/unsafe-eval'
import {Application, Container, UPDATE_PRIORITY} from 'pixi.js'
import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument} from '../document'
import type {MotionMix} from '../playback'
import {canReuseLayerResources, canReusePartResources} from '../internal/render-plan'
import {layoutPlayerRoot, type PuppetFraming} from '../internal/layout-player-root'
import type {RenderOverrides} from '../internal/render-overrides'
import {applyRenderFrame} from './apply-render-frame'
import {replaceBackBufferPresentation} from './back-buffer-presentation'
import {documentUsesBackdropBlend} from './part-blend-filter'
import {initializeRuntimeParts} from './initialize-runtime-parts'
import {destroyRuntimeMask, renderRuntimeMask} from './part-mask'
import type {RuntimeLayer, RuntimePart} from './types'

const MINIMUM_MASK_RESOLUTION = 0.01
const MILLISECONDS_PER_SECOND = 1000

interface CreatePlayerRendererOptions {
  readonly canvas: HTMLCanvasElement
  readonly document: PuppetDocument
  readonly onAfterRender?: () => void
  readonly onBeforeRender?: () => void
  readonly resolution?: number
  readonly framing?: PuppetFraming
  readonly resizeTo?: HTMLElement
  readonly viewportPadding?: number
}

export interface PlayerRenderer {
  applyFrame(
    mix: MotionMix,
    parameterValues: PuppetParameterValueMap,
    poseOpacityByPartId?: ReadonlyMap<string, number>,
    overrides?: RenderOverrides,
  ): void
  destroy(): void
  /** Part IDs of the last applied frame in paint order, back to front. */
  getPaintOrder(): ReadonlyArray<string>
  /** Deformed vertices of the last applied frame in document coordinates. */
  getPartVertices(partId: string): ArrayLike<number> | undefined
  /** Converts canvas CSS pixels to document coordinates. */
  toDocumentPoint(point: {readonly x: number; readonly y: number}): {x: number; y: number}
  redraw(): void
  resize(): void
  setViewCamera(camera: PlayerViewCamera): void
  setRunning(running: boolean): void
  subscribeFrame(onFrame: (deltaTime: number) => void): void
  updateDocument(document: PuppetDocument): boolean
}

interface RenderPartMasksOptions {
  readonly application: Application
  readonly externalRendering: boolean
  readonly layerById: ReadonlyMap<string, RuntimeLayer>
  readonly partById: ReadonlyMap<string, RuntimePart>
  readonly root: Container
}

/** Masks of visible parts and layers with the vertex arrays that bound them. */
const visibleMasks = (options: RenderPartMasksOptions) => [
  ...[...options.partById.values()].flatMap((part) =>
    part.mask !== undefined && part.mesh.visible
      ? [{mask: part.mask, vertexSets: [part.vertices]}]
      : [],
  ),
  ...[...options.layerById.values()].flatMap((layer) =>
    layer.mask !== undefined && layer.container.visible && layer.memberPartIds.length > 0
      ? [
          {
            mask: layer.mask,
            // The members' own arrays bound the layer; they are not copied into one.
            vertexSets: layer.memberPartIds.flatMap((partId) => {
              const vertices = options.partById.get(partId)?.vertices
              return vertices === undefined ? [] : [vertices]
            }),
          },
        ]
      : [],
  ),
]

const renderPartMasks = (options: RenderPartMasksOptions) => {
  let stateReset = false
  for (const {mask, vertexSets} of visibleMasks(options)) {
    if (!stateReset && options.externalRendering) {
      // External drawing can change the shared WebGL state before this mask pass.
      options.application.renderer.resetState()
      stateReset = true
    }
    const resolution = Math.max(
      MINIMUM_MASK_RESOLUTION,
      options.application.renderer.resolution * options.root.scale.x,
    )
    renderRuntimeMask(mask, options.application.renderer, resolution, vertexSets)
  }
}

const createApplication = async (options: CreatePlayerRendererOptions) => {
  const application = new Application()
  const resizeTarget = options.resizeTo ?? options.canvas.parentElement
  await application.init({
    antialias: true,
    autoDensity: true,
    backgroundAlpha: 0,
    canvas: options.canvas,
    height: options.document.viewport.height,
    ...(options.onAfterRender === undefined ? {} : {preference: 'webgl' as const}),
    resolution: options.resolution ?? Math.min(window.devicePixelRatio, 2),
    // WebGL reads the drawn scene for backdrop blending only through a back buffer.
    useBackBuffer: documentUsesBackdropBlend(options.document),
    width: options.document.viewport.width,
    ...(resizeTarget === null ? {} : {resizeTo: resizeTarget}),
  })
  const presentation = replaceBackBufferPresentation(
    (application.renderer as {backBuffer?: unknown} | undefined)?.backBuffer,
  )
  if (presentation === 'unsupported') {
    console.warn('Puppet player could not replace the PixiJS back buffer presentation.')
  }
  return application
}

/** Releases the masks and filters of parts and offscreen layers. */
const destroyRuntimeFilters = (items: ReadonlyArray<RuntimeLayer | RuntimePart>) => {
  for (const item of items) {
    if (item.mask !== undefined) {
      destroyRuntimeMask(item.mask)
    }
    item.colorFilter?.destroy()
    item.blendFilter?.filter.destroy()
  }
}

export const createPlayerRenderer = async (
  options: CreatePlayerRendererOptions,
): Promise<PlayerRenderer> => {
  const application = await createApplication(options)
  const root = new Container()
  const partById = new Map<string, RuntimePart>()
  const layerById = new Map<string, RuntimeLayer>()
  let {document} = options
  let camera: PlayerViewCamera | undefined
  let paintOrder: ReadonlyArray<string> = []
  let destroyed = false
  let running = true
  const destroy = () => {
    if (destroyed) {
      return
    }
    destroyed = true
    destroyRuntimeFilters([...partById.values(), ...layerById.values()])
    application.destroy(
      {removeView: false},
      {children: true, context: false, texture: true, textureSource: true},
    )
  }
  try {
    await initializeRuntimeParts({document, layerById, partById, root})
    application.stage.addChild(root)
  } catch (error) {
    destroy()
    throw new Error('Puppet player resource initialization failed', {cause: error})
  }
  const layoutRoot = () =>
    layoutPlayerRoot({
      camera,
      document,
      framing: options.framing,
      root,
      screen: application.screen,
      viewportPadding: options.viewportPadding,
    })
  const finishRender = () => {
    options.onAfterRender?.()
    application.renderer.resetState()
  }
  const prepareRender = () => {
    options.onBeforeRender?.()
    application.renderer.resetState()
  }
  if (options.onAfterRender !== undefined) {
    application.ticker.add(prepareRender, undefined, UPDATE_PRIORITY.LOW + 1)
    application.ticker.add(finishRender, undefined, UPDATE_PRIORITY.LOW - 1)
  }
  const redraw = () => {
    if (destroyed) {
      return
    }
    if (options.onAfterRender !== undefined) {
      prepareRender()
    }
    application.render()
    if (options.onAfterRender !== undefined) {
      finishRender()
    }
  }
  return {
    applyFrame(mix, parameterValues, poseOpacityByPartId, overrides) {
      paintOrder = applyRenderFrame({
        document,
        layerById,
        layoutRoot,
        mix,
        overrides,
        parameterValues,
        partById,
        poseOpacityByPartId,
        root,
      })
      renderPartMasks({
        application,
        externalRendering: options.onAfterRender !== undefined,
        layerById,
        partById,
        root,
      })
    },
    destroy,
    getPaintOrder: () => paintOrder,
    getPartVertices: (partId) => partById.get(partId)?.vertices,
    redraw,
    resize() {
      application.resize()
      layoutRoot()
      redraw()
    },
    setRunning(nextRunning) {
      if (destroyed || nextRunning === running) {
        return
      }
      running = nextRunning
      if (running) {
        application.start()
      } else {
        application.stop()
      }
    },
    setViewCamera(nextCamera) {
      if (destroyed) {
        return
      }
      camera = nextCamera
      layoutRoot()
    },
    subscribeFrame(onFrame) {
      application.ticker.add((ticker) => {
        if (!destroyed) {
          onFrame(Math.max(0, ticker.deltaMS / MILLISECONDS_PER_SECOND))
        }
      })
    },
    toDocumentPoint(point) {
      const local = root.toLocal(point)
      return {x: local.x, y: local.y}
    },
    updateDocument(nextDocument) {
      if (
        destroyed ||
        !canReusePartResources(document, nextDocument) ||
        !canReuseLayerResources(document, nextDocument) ||
        documentUsesBackdropBlend(document) !== documentUsesBackdropBlend(nextDocument)
      ) {
        return false
      }
      document = nextDocument
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
      return true
    },
  }
}
