import type {Direction} from './direction'
import type {Position} from './deep-position'

export function* generateLine(
  point: Position,
  direction: Direction,
  range: number,
  includeOrigin: boolean = false,
) {
  const {x: startX, y: startY} = point

  const start = includeOrigin ? 0 : 1

  for (let index = start; index < range; index += 1) {
    yield {x: startX + index, y: startY + index}
  }
}

export const createLine = (
  point: Position,
  direction: Direction,
  range: number,
  includeOrigin: boolean = false,
) => {
  const points = generateLine(point, direction, range, includeOrigin)

  return () => {
    return points.next().value
  }
}
