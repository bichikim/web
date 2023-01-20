import {Rect} from '@winter-love/utils'
export const getStartPosition = (targetRect: Rect, _?: any) => {
  return {
    x: targetRect.x,
    y: targetRect.y,
  }
}
