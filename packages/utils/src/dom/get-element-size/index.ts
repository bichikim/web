import {Rect} from 'src/types'
import {isWindow} from 'src/validate/is-window'

export const DEFAULT_RECT = {
  height: 0,
  width: 0,
  x: 0,
  y: 0,
}

export const getElementSize = (
  element?: HTMLElement | Window | null,
  defaultRect: Rect = DEFAULT_RECT,
): Rect => {
  if (!element) {
    return {
      ...defaultRect,
    }
  }
  if (isWindow(element)) {
    return {
      height: element.innerHeight,
      width: element.innerWidth,
      x: 0,
      y: 0,
    }
  }
  const rect = (element as any).getBoundingClientRect?.()
  if (rect) {
    return {
      height: rect.height,
      width: rect.width,
      x: rect.x,
      y: rect.y,
    }
  }

  return {
    ...defaultRect,
  }
}
