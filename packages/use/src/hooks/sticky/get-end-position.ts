import {Rect, Size} from '@winter-love/utils'

export const getEndPosition = (targetRect: Rect, element: Size) => {
  return {
    x: targetRect.x + targetRect.width - element.width,
    y: targetRect.y + targetRect.height - element.height,
  }
}
