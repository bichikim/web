import type {ViewCamera} from './view-camera'
interface AttachViewPanOptions {
  readonly element: HTMLElement
  readonly camera: () => ViewCamera
  readonly onChange: (camera: ViewCamera) => void
  readonly onPanningChange?: (panning: boolean) => void
}
/** Binds middle-button panning and releases its listeners on cleanup. */
export const attachViewPan = (options: AttachViewPanOptions) => {
  let drag: {pointer: number; x: number; y: number; camera: ViewCamera} | undefined
  const stop = () => {
    drag = undefined
    options.onPanningChange?.(false)
  }
  const down = (event: PointerEvent) => {
    if (event.button !== 1) {
      return
    }
    event.preventDefault()
    drag = {camera: options.camera(), pointer: event.pointerId, x: event.clientX, y: event.clientY}
    options.element.setPointerCapture(event.pointerId)
    options.onPanningChange?.(true)
  }
  const move = (event: PointerEvent) => {
    if (drag === undefined || drag.pointer !== event.pointerId) {
      return
    }
    options.onChange({
      ...drag.camera,
      x: drag.camera.x - (event.clientX - drag.x) / drag.camera.zoom,
      y: drag.camera.y - (event.clientY - drag.y) / drag.camera.zoom,
    })
  }
  const up = (event: PointerEvent) => {
    if (drag?.pointer === event.pointerId) {
      stop()
      options.element.releasePointerCapture(event.pointerId)
    }
  }
  options.element.addEventListener('pointerdown', down)
  options.element.addEventListener('pointermove', move)
  options.element.addEventListener('pointerup', up)
  options.element.addEventListener('pointercancel', stop)
  options.element.addEventListener('lostpointercapture', stop)
  return () => {
    options.element.removeEventListener('pointerdown', down)
    options.element.removeEventListener('pointermove', move)
    options.element.removeEventListener('pointerup', up)
    options.element.removeEventListener('pointercancel', stop)
    options.element.removeEventListener('lostpointercapture', stop)
  }
}
