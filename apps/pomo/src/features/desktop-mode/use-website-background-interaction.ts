import {
  type DesktopBackgroundMouseEvent,
  type DesktopBackgroundPointerEventKind,
  forwardDesktopBackgroundMouseEvent,
} from './runtime'

const FORWARDED_BUTTONS = new Set([0, 1, 2])

const getMouseEvent = (
  kind: DesktopBackgroundPointerEventKind,
  event: PointerEvent,
  fallbackButton = 0,
): DesktopBackgroundMouseEvent => ({
  altKey: event.altKey,
  button: event.button < 0 ? fallbackButton : event.button,
  buttons: event.buttons,
  clickCount: Math.max(1, event.detail),
  ctrlKey: event.ctrlKey,
  kind,
  metaKey: event.metaKey,
  shiftKey: event.shiftKey,
  x: event.clientX,
  y: event.clientY,
})

const getWheelEvent = (event: WheelEvent): DesktopBackgroundMouseEvent => ({
  altKey: event.altKey,
  button: Math.max(0, event.button),
  buttons: event.buttons,
  clickCount: 1,
  ctrlKey: event.ctrlKey,
  deltaMode: event.deltaMode,
  deltaX: event.deltaX,
  deltaY: event.deltaY,
  deltaZ: event.deltaZ,
  kind: 'wheel',
  metaKey: event.metaKey,
  shiftKey: event.shiftKey,
  x: event.clientX,
  y: event.clientY,
})

const isForwardedButton = (event: PointerEvent): boolean => FORWARDED_BUTTONS.has(event.button)

const handleClick = (event: MouseEvent): void => {
  event.preventDefault()
  event.stopPropagation()
}

export const useWebsiteBackgroundInteraction = () => {
  let forwardedPointerId: number | null = null
  let forwardedButton = 0
  let eventQueue = Promise.resolve()

  const enqueue = (event: DesktopBackgroundMouseEvent): void => {
    eventQueue = eventQueue
      .catch(() => undefined)
      .then(() => forwardDesktopBackgroundMouseEvent(event))
      .catch((error: unknown) => {
        if (import.meta.env.DEV) {
          console.error('Failed to forward website background input event', error)
        }
      })
  }

  const handlePointerDown = (event: PointerEvent): void => {
    if (!isForwardedButton(event)) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    forwardedPointerId = event.pointerId
    forwardedButton = event.button
    if (
      event.currentTarget instanceof HTMLElement &&
      typeof event.currentTarget.setPointerCapture === 'function'
    ) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    enqueue(getMouseEvent('down', event))
  }

  const handlePointerMove = (event: PointerEvent): void => {
    if (forwardedPointerId !== null && forwardedPointerId !== event.pointerId) {
      return
    }
    if (forwardedPointerId === null && event.buttons !== 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    enqueue(getMouseEvent(event.buttons === 0 ? 'moved' : 'dragged', event, forwardedButton))
  }

  const handlePointerLeave = (event: PointerEvent): void => {
    if (forwardedPointerId !== null) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    enqueue(getMouseEvent('left', event))
  }

  const handleWheel = (event: WheelEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    enqueue(getWheelEvent(event))
  }

  const finishPointer = (event: PointerEvent, kind: 'up' | 'cancelled'): void => {
    if (forwardedPointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const button = kind === 'up' && event.button >= 0 ? event.button : forwardedButton
    if (
      event.currentTarget instanceof HTMLElement &&
      typeof event.currentTarget.releasePointerCapture === 'function'
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    forwardedPointerId = null
    forwardedButton = 0
    enqueue(getMouseEvent(kind, event, button))
  }

  return {
    handleClick,
    handleContextMenu: handleClick,
    handlePointerCancel: (event: PointerEvent) => finishPointer(event, 'cancelled'),
    handlePointerDown,
    handlePointerLeave,
    handlePointerMove,
    handlePointerUp: (event: PointerEvent) => finishPointer(event, 'up'),
    handleWheel,
  }
}
