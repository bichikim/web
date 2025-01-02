import {Rect, Size} from '@winter-love/utils'
import {UseStickyRelativePosition} from './types'
import {getPositionMethod} from './get-position-method'

export const getPosition = (
  position: UseStickyRelativePosition,
  targetRect: Rect,
  element: Size,
) => {
  return getPositionMethod(position)(targetRect, element)
}
