import type {Direction} from './direction'
import type {Position} from './deep-position'

const DEFAULT_GAP = 1
const DEFAULT_RANGE = 20

export function *generateTornado(
  point: Position,
  range: number = DEFAULT_RANGE,
  gap: number = DEFAULT_GAP,
  includeOrigin: boolean = false,
) {
  const {x, y} = point
  let loop = 1

  if (includeOrigin) {
    yield {x, y}
  }

  while (gap * loop < range) {
    for (let index = -loop + 1; index < loop; index += 1) {
      yield {x: x + gap * loop, y: y + gap * index}
    }

    for (let index = loop; index > -loop; index -= 1) {
      yield {x: x + gap * index, y: y + gap * loop}
    }

    for (let index = loop; index > -loop; index -= 1) {
      yield {x: x - gap * loop, y: y + gap * index}
    }

    for (let index = -loop; index <= loop; index += 1) {
      yield {x: x + gap * index, y: y - gap * loop}
    }

    loop += 1
  }
}

export interface CreateTornadoOptions {
  gap?: number
  includeOrigin?: boolean
  range?: number
}

export const createTornado = (
  position: Position,
  direction: Direction,
  options?: CreateTornadoOptions,
) => {
  const {range = DEFAULT_RANGE, gap = DEFAULT_GAP, includeOrigin = false} = options ?? {}
  const points = generateTornado(position, range, gap, includeOrigin)

  return () => {
    return points.next().value
  }
}
