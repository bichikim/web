import {type Accessor, onCleanup} from 'solid-js'

/** Owns one captured gesture and ends its edit transaction when the window loses focus. */
export const usePointerGesture = (options: {
  readonly element: Accessor<SVGSVGElement | undefined>
  readonly onEnd: () => void
  readonly onStart: () => void
}) => {
  let capture: {readonly pointerId: number; readonly element: SVGSVGElement | undefined} | undefined
  const owns = (event: PointerEvent) =>
    capture !== undefined && capture.pointerId === event.pointerId
  const stop = (event?: PointerEvent) => {
    if (capture === undefined || (event !== undefined && !owns(event))) {
      return
    }
    const previous = capture
    capture = undefined
    if (previous.element?.hasPointerCapture?.(previous.pointerId)) {
      previous.element.releasePointerCapture(previous.pointerId)
    }
    options.onEnd()
  }
  const cancel = () => stop()
  globalThis.addEventListener('blur', cancel)
  onCleanup(() => {
    globalThis.removeEventListener('blur', cancel)
    stop()
  })
  return {
    active: () => capture !== undefined,
    owns,
    start: (event: PointerEvent) => {
      const element = options.element()
      capture = {element, pointerId: event.pointerId}
      element?.focus()
      element?.setPointerCapture?.(event.pointerId)
      options.onStart()
    },
    stop,
  }
}
