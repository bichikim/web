import {Rect} from 'src/types'

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
  if (element === window) {
    return {
      height: element.innerHeight,
      width: element.innerWidth,
      x: 0,
      y: 0,
    }
  }
  const rect = (element as any).getBoundingClientRect()
  return {
    height: rect.height,
    width: rect.width,
    x: rect.x,
    y: rect.y,
  }
}
