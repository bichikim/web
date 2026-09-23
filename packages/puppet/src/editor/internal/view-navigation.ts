import {type ViewCamera, zoomViewCamera} from './view-camera'

interface ViewNavigationOptions {
  readonly element: HTMLElement
  readonly camera: () => ViewCamera
  readonly onChange: (camera: ViewCamera) => void
}

interface ViewGestureEvent extends MouseEvent {
  readonly scale: number
}
const isGesture = (event: Event): event is ViewGestureEvent =>
  'scale' in event &&
  typeof event.scale === 'number' &&
  'clientX' in event &&
  typeof event.clientX === 'number' &&
  'clientY' in event &&
  typeof event.clientY === 'number'

/** Binds scrolling and pinch gestures to the camera; returns listener cleanup. */
export const attachViewNavigation = (options: ViewNavigationOptions): (() => void) => {
  const WHEEL_SCALE = 0.002
  const LINE_PIXELS = 16
  let gesture: ViewCamera | undefined
  const anchor = (event: MouseEvent) => {
    const bounds = options.element.getBoundingClientRect()
    return {x: event.clientX - bounds.left, y: event.clientY - bounds.top}
  }
  const wheel = (event: WheelEvent) => {
    event.preventDefault()
    if (gesture !== undefined) {
      return
    }
    const camera = options.camera()
    const units =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? LINE_PIXELS
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? options.element.clientHeight
          : 1
    if (event.ctrlKey) {
      options.onChange(
        zoomViewCamera(
          camera,
          camera.zoom * Math.exp(-event.deltaY * units * WHEEL_SCALE),
          anchor(event),
        ),
      )
      return
    }
    options.onChange({
      ...camera,
      x: camera.x + (event.deltaX * units) / camera.zoom,
      y: camera.y + (event.deltaY * units) / camera.zoom,
    })
  }
  const start = (event: Event) => {
    if (!isGesture(event)) {
      return
    }
    event.preventDefault()
    gesture = options.camera()
  }
  const change = (event: Event) => {
    if (
      !isGesture(event) ||
      gesture === undefined ||
      !Number.isFinite(event.scale) ||
      event.scale <= 0
    ) {
      return
    }
    event.preventDefault()
    options.onChange(zoomViewCamera(gesture, gesture.zoom * event.scale, anchor(event)))
  }
  const end = (event: Event) => {
    event.preventDefault()
    gesture = undefined
  }
  const blur = () => {
    gesture = undefined
  }
  options.element.addEventListener('wheel', wheel, {passive: false})
  options.element.addEventListener('gesturestart', start, {passive: false})
  options.element.addEventListener('gesturechange', change, {passive: false})
  options.element.addEventListener('gestureend', end, {passive: false})
  window.addEventListener('blur', blur)
  return () => {
    options.element.removeEventListener('wheel', wheel)
    options.element.removeEventListener('gesturestart', start)
    options.element.removeEventListener('gesturechange', change)
    options.element.removeEventListener('gestureend', end)
    window.removeEventListener('blur', blur)
  }
}
