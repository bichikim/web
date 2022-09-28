import {Rect, Size} from 'src/types'
import {RelativePosition} from './types'
import {getPositionMethod} from './get-position-method'
export const getPosition = (position: RelativePosition, targetRect: Rect, element: Size) => {
  return getPositionMethod(position)(targetRect, element)
}
