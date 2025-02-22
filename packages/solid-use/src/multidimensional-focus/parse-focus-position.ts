import {FocusPosition, Point} from './types'

export const parsePoint = (pointString: string): Point => {
  const [x, y] = pointString.split(',').map(Number)

  return {x, y}
}

export const parseFocusPosition = (focusPositionString: string): FocusPosition => {
  return focusPositionString.split('|').map((element) => parsePoint(element))
}
