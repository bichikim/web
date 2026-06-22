import {isWindow, type Rect} from '@winter-love/utils'

export function getBounds(target: HTMLElement): Rect
export function getBounds(target: Window): Rect
export function getBounds(target: HTMLElement | Window): Rect {
  if (isWindow(target)) {
    return {height: target.innerHeight, width: target.innerWidth, x: 0, y: 0}
  }

  const rect = target.getBoundingClientRect()

  return {height: rect.height, width: rect.width, x: rect.x, y: rect.y}
}
