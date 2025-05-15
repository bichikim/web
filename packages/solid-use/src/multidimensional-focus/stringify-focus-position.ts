import {FocusPosition, Point} from './types'

export const stringifyPoint = (point: Point): string => {
  return `${point.x},${point.y}`
}

export const stringifyFocusPosition = (focusPosition: FocusPosition) => {
  return focusPosition.map(stringifyPoint).join('|')
}
