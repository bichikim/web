import {Application, Container, UPDATE_PRIORITY} from 'pixi.js'
import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument} from '../document'
import type {MotionMix} from '../playback'
import {canReusePartResources} from '../internal/render-plan'
import {layoutPlayerRoot} from '../internal/layout-player-root'
import {applyRenderFrame} from './apply-render-frame'
import {initializeRuntimeParts} from './initialize-runtime-parts'
import {destroyRuntimeMask, renderRuntimeMask} from './part-mask'
import type {RuntimePart} from './types'

const MINIMUM_MASK_RESOLUTION = 0.01
const MILLISECONDS_PER_SECOND = 1000

interface CreatePlayerRendererOptions {
  readonly canvas: HTMLCanvasElement
  readonly document: PuppetDocument
  readonly onAfterRender?: () => void
  readonly onBeforeRender?: () => void
  readonly resolution?: number
  readonly resizeTo?: HTMLElement
  readonly viewportPadding?: number
}

export interface PlayerRenderer {
  applyFrame(mix: MotionMix, parameterValues: PuppetParameterValueMap): void
  destroy(): void
  redraw(): void
  resize(): void
  setRunning(running: boolean): void
  subscribeFrame(onFrame: (deltaTime: number) => void): void
  updateDocument(document: PuppetDocument): boolean
}

interface RenderPartMasksOptions {
  readonly application: Application
  readonly externalRendering: boolean
  readonly partById: ReadonlyMap<string, RuntimePart>
  readonly root: Container
}

const renderPartMasks = (options: RenderPartMasksOptions) => {
  let stateReset = false
  for (const part of options.partById.values()) {
    if (part.mask !== undefined && part.mesh.visible) {
      if (!stateReset && options.externalRendering) {
        // External drawing can change the shared WebGL state before this mask pass.
        options.application.renderer.resetState()
        stateReset = true
      }
      const resolution = Math.max(
        MINIMUM_MASK_RESOLUTION,
        options.application.renderer.resolution * options.root.scale.x,
      )
      renderRuntimeMask(part.mask, options.application.renderer, resolution, part.vertices)
    }
  }
}

export const createPlayerRenderer = async (
  options: CreatePlayerRendererOptions,
): Promise<PlayerRenderer> => {
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
    width: options.document.viewport.width,
    ...(resizeTarget === null ? {} : {resizeTo: resizeTarget}),
  })
  const root = new Container()
  const partById = new Map<string, RuntimePart>()
  let {document} = options
  let destroyed = false
  let running = true
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
    application.destroy(
      {removeView: false},
      {children: true, context: false, texture: true, textureSource: true},
    )
  }
  try {
    await initializeRuntimeParts({document, partById, root})
    application.stage.addChild(root)
  } catch (error) {
    destroy()
    throw new Error('Puppet player resource initialization failed', {cause: error})
  }
  const layoutRoot = () =>
    layoutPlayerRoot({
      document,
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
    applyFrame(mix, parameterValues) {
      applyRenderFrame({document, layoutRoot, mix, parameterValues, partById, root})
      renderPartMasks({
        application,
        externalRendering: options.onAfterRender !== undefined,
        partById,
        root,
      })
    },
    destroy,
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
    subscribeFrame(onFrame) {
      application.ticker.add((ticker) => {
        if (!destroyed) {
          onFrame(Math.max(0, ticker.deltaMS / MILLISECONDS_PER_SECOND))
        }
      })
    },
    updateDocument(nextDocument) {
      if (destroyed || !canReusePartResources(document, nextDocument)) {
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
