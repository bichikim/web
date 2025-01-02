import {Rect, Size} from '@winter-love/utils'

export const getCenterPosition = (targetRect: Rect, element: Size) => {
  return {
    x: targetRect.x + targetRect.width / 2 - element.width / 2,
    y: targetRect.y + targetRect.height / 2 - element.height / 2,
  }
}
