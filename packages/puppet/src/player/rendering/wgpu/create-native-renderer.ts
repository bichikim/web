import type {
  NativePlayerBackend,
  NativePlayerSurface,
  NativePlayerSurfaceKind,
  NativePlayerTarget,
} from '../../native-backend'
import type {ComputedRenderFrame} from '../../internal/compute-render-frame'
import type {PlayerFramePresentation} from '../../rendering-options'
import type {CreatePlayerRendererOptions, PlayerRenderer} from '../create-player-renderer'
import {createNativePlayback} from './create-native-playback'
import {createGpuFrameStore} from './create-frame-store'
import {createGpuView} from './create-view'
import {createGpuClock} from './create-clock'
import {createWgpuPicker} from './create-picker'
import {describeMeshes} from './describe-meshes'
import {loadTextureImage} from '../../internal/load-texture-image'
import {packDisplay} from './display'

interface NativeRendererResources {
  readonly frames: ReturnType<typeof createGpuFrameStore>
  readonly view: ReturnType<typeof createGpuView>
  readonly images: Map<string, HTMLImageElement>
  readonly kind: NativePlayerSurfaceKind
  readonly surface: NativePlayerSurface
}

const resizeInputCanvas = (canvas: HTMLCanvasElement, {width, height}: NativePlayerTarget) => {
  if (canvas.width !== width) {
    canvas.width = width
  }
  if (canvas.height !== height) {
    canvas.height = height
  }
}

const attachNativeRenderer = (
  options: CreatePlayerRendererOptions,
  {frames, images, kind, surface, view}: NativeRendererResources,
): PlayerRenderer => {
  const clock = createGpuClock()
  let disposed = false
  let generation = 0
  let redrawPending = false
  let pending = Promise.resolve<PlayerFramePresentation>('superseded')
  const playback = createNativePlayback({
    beforeRender: options.onBeforeRender,
    capture: options.alphaCapture,
    revision: () => (disposed ? undefined : generation),
    surface,
    viewport: () => ({...view.pixels(), view: view.transform()}),
    waitForRedraw: () => pending,
  })
  const showFrame = (
    frame: ComputedRenderFrame,
    document: ReturnType<typeof frames.document>,
    target: NativePlayerTarget,
  ) => {
    resizeInputCanvas(options.canvas, target)
    frames.show(frame, document)
    view.setDisplayed(target.view)
    options.onAfterRender?.()
  }
  const submit = (frame: ComputedRenderFrame): Promise<PlayerFramePresentation> => {
    generation += 1
    const request = generation
    const document = frames.document()
    const show = async (): Promise<PlayerFramePresentation> => {
      if (disposed || request !== generation) {
        return disposed ? 'destroyed' : 'superseded'
      }
      const size = view.pixels()
      const transform = view.transform()
      const alpha = playback.requestAlpha()
      options.onBeforeRender?.()
      const sample = await surface.present({
        ...size,
        ...(alpha === undefined ? {} : {alpha}),
        display: packDisplay(frame.frame, frames.partIndex),
        ...(frame.geometry === undefined ? {} : {frame: frame.geometry.frame}),
        vertices: frame.vertices,
        view: transform,
      })
      if (disposed || request !== generation) {
        return disposed ? 'destroyed' : 'superseded'
      }
      showFrame(frame, document, {...size, view: transform})
      if (alpha !== undefined) {
        playback.alphaSample(alpha, sample)
      }
      return 'presented'
    }
    pending = pending.then(show, show)
    return pending
  }
  const redraw = () => {
    if (playback.drawing()) {
      redrawPending = true
      return
    }
    const frame = frames.redrawable()
    if (!disposed && frame !== undefined) {
      submit(frame).catch((cause: unknown) => {
        options.onRenderError?.(new Error('Native frame could not be displayed', {cause}))
      })
    }
  }

  return {
    applyFrame: frames.applyFrame,
    applyPreparedFrame: frames.applyPreparedFrame,
    cancelPresentation() {
      generation += 1
      redrawPending = false
      frames.cancel()
    },
    destroy() {
      disposed = true
      generation += 1
      clock.destroy()
      images.forEach((image) => image.removeAttribute('src'))
      images.clear()
      surface.close()
    },
    async flush() {
      await pending
    },
    getPaintOrder: frames.getPaintOrder,
    getPartVertices: frames.getPartVertices,
    getRenderingInfo: () => ({
      antialiasing: 'msaa',
      nativeSurface: kind,
      renderer: 'webgpu',
      runtime: 'wgpu',
    }),
    hitTestDisplayed: (point) => frames.hitTest(view.toDocumentPoint(point)),
    nativePlayback: playback.nativePlayback,
    pickPart: createWgpuPicker({
      canvas: options.canvas,
      document: frames.document,
      frame: frames.frame,
      images,
      vertices: frames.getPartVertices,
    }),
    async presentFrame(frame) {
      frames.applyPreparedFrame(frame)
      const target = frame.nativeTarget
      if (target === undefined) {
        return submit(frame)
      }
      showFrame(frame, frames.document(), target)
      if (target.alpha !== undefined) {
        playback.readAlpha(target.alpha)
      }
      if (redrawPending) {
        redrawPending = false
        redraw()
      }
      return 'presented'
    },
    redraw,
    async releasePreparedFrame(frame) {
      const token = frame.geometry
      if (!disposed && token !== undefined) {
        await surface.release(token.frame)
      }
    },
    resize(next) {
      view.resize(next)
      redraw()
    },
    setFit(next) {
      view.setFit(next)
      redraw()
    },
    setRunning: clock.setRunning,
    setViewCamera(next) {
      view.setViewCamera(next)
      redraw()
    },
    subscribeFrame: clock.subscribeFrame,
    toDocumentPoint: view.toDocumentPoint,
    updateDocument: frames.updateDocument,
  }
}

/** Keeps the transparent canvas as the input surface while the platform owns the pixels. */
export const createNativeRenderer = async (
  options: CreatePlayerRendererOptions,
  backend: NativePlayerBackend,
): Promise<PlayerRenderer> => {
  const frames = createGpuFrameStore(options.document)
  const view = createGpuView(options, frames.document)
  const sources = [...new Set(options.document.parts.map((part) => part.texture.src))]
  const images = new Map(
    await Promise.all(
      sources.map(async (source) => [source, await loadTextureImage(source)] as const),
    ),
  )
  const surface = await backend.open({
    ...view.pixels(),
    metadata: describeMeshes(options.document, sources),
    textures: sources,
  })
  return attachNativeRenderer(options, {
    frames,
    images,
    kind: backend.kind ?? 'metal',
    surface,
    view,
  })
}
