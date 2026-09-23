import {type DesktopBackgroundMouseEvent, forwardDesktopBackgroundMouseEvent} from './runtime'

const FORWARDED_BUTTONS = new Set([0, 1, 2])

const getMouseEvent = (
  kind: DesktopBackgroundMouseEvent['kind'],
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
          console.error('Failed to forward website background pointer event', error)
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
    if (forwardedPointerId !== event.pointerId || event.buttons === 0) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    enqueue(getMouseEvent('dragged', event, forwardedButton))
  }

  const finishPointer = (event: PointerEvent, useEventButton: boolean): void => {
    if (forwardedPointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const button = useEventButton && event.button >= 0 ? event.button : forwardedButton
    if (
      event.currentTarget instanceof HTMLElement &&
      typeof event.currentTarget.releasePointerCapture === 'function'
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    forwardedPointerId = null
    forwardedButton = 0
    enqueue(getMouseEvent('up', event, button))
  }

  return {
    handleClick,
    handleContextMenu: handleClick,
    handlePointerCancel: (event: PointerEvent) => finishPointer(event, false),
    handlePointerDown,
    handlePointerMove,
    handlePointerUp: (event: PointerEvent) => finishPointer(event, true),
  }
}
