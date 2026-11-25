import type {CreatePlayerRendererOptions, PlayerRenderer} from '../create-player-renderer'
import type {ComputedRenderFrame} from '../../internal/compute-render-frame'
import {createGpuClock} from './create-clock'
import {createGpuFrameStore} from './create-frame-store'
import {createGpuResources} from './create-resources'
import {createGpuView} from './create-view'
import {createGpuPresenter, type Presentation} from './create-presenter'
import {createWgpuPicker} from './create-picker'
import {packDisplay} from './display'

/** Owns a Rust/wgpu Worker, the caller's Canvas, displayed geometry and input conversion. */
export const createWgpuRenderer = async (
  options: CreatePlayerRendererOptions,
): Promise<PlayerRenderer> => {
  const frames = createGpuFrameStore(options.document)
  const view = createGpuView(options, frames.document)
  const {client, context, images} = await createGpuResources(options, view.pixels())
  const clock = createGpuClock()
  let presentationEpoch = 0
  let disposed = false
  const presenter = createGpuPresenter({
    client,
    onError: (cause) => options.onRenderError?.(cause),
    presentation: options.gpuPresentation,
    show(bitmap, presentation) {
      if (disposed) {
        bitmap?.close()
        return
      }
      if (bitmap !== null && context !== null) {
        options.onBeforeRender?.()
        if (options.canvas.width !== presentation.width) {
          options.canvas.width = presentation.width
        }
        if (options.canvas.height !== presentation.height) {
          options.canvas.height = presentation.height
        }
        context.transferFromImageBitmap(bitmap)
      }
      frames.show(presentation.frame, presentation.document)
      view.setDisplayed(presentation.view)
      options.onAfterRender?.()
    },
    surface: options.canvas.ownerDocument,
  })
  const describe = (frame: ComputedRenderFrame): Presentation => ({
    ...view.pixels(),
    display: packDisplay(frame.frame, frames.partIndex),
    document: frames.document(),
    frame,
    kind: 'draw',
    ...(frame.geometry === undefined ? {} : {geometry: frame.geometry}),
    vertices: frame.vertices,
    view: view.transform(),
  })
  const redraw = () => {
    const frame = frames.redrawable()
    if (!disposed && frame !== undefined) {
      presenter.queue(describe(frame))
    }
  }
  const picker = createWgpuPicker({
    canvas: options.canvas,
    document: frames.document,
    frame: frames.frame,
    images,
    vertices: frames.getPartVertices,
  })
  return {
    applyFrame: frames.applyFrame,
    applyPreparedFrame: frames.applyPreparedFrame,
    cancelPresentation() {
      presentationEpoch += 1
      frames.cancel()
      client.cancelAlpha()
      presenter.cancel()
    },
    connectGeometry: client.connectGeometry,
    destroy() {
      if (disposed) {
        return
      }
      disposed = true
      presentationEpoch += 1
      presenter.destroy()
      clock.destroy()
      client.destroy()
      context?.transferFromImageBitmap(null)
      images.forEach((image) => image.removeAttribute('src'))
      images.clear()
    },
    flush: presenter.flush,
    getPaintOrder: frames.getPaintOrder,
    getPartVertices: frames.getPartVertices,
    getRenderingInfo: () => ({
      antialiasing: options.antialiasing === 'ssaa' ? 'ssaa' : 'msaa',
      renderer: 'webgpu',
      runtime: 'wgpu',
    }),
    hitTestDisplayed: (point) => frames.hitTest(view.toDocumentPoint(point)),
    pickPart: picker,
    prepareFrame(frame) {
      if (!disposed && frame.geometry !== undefined) {
        presenter.prepare(() => describe(frame))
      }
    },
    async presentFrame(frame) {
      const epoch = presentationEpoch
      frames.applyPreparedFrame(frame)
      presenter.queue(describe(frame))
      await presenter.flush()
      if (disposed) {
        return 'destroyed'
      }
      return epoch === presentationEpoch ? 'presented' : 'superseded'
    },
    redraw,
    releasePreparedFrame(frame) {
      const token = frame.geometry
      if (token !== undefined) {
        const current = presenter.discardPreparation(frame)
        if (current !== undefined) {
          return current.then(() => client.releaseGeometry(token))
        }
        client.releaseGeometry(token)
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
