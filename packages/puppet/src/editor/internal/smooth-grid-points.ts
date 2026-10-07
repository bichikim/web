import {clamp} from 'es-toolkit/math'
import type {PuppetPoint} from '../../player'

interface SmoothGridPointsOptions {
  readonly transform?: (point: PuppetPoint) => PuppetPoint
  readonly center: PuppetPoint
  readonly columns: number
  readonly controlPoints: readonly number[]
  readonly radius: number
  readonly rows: number
  readonly strength: number
}

/** Blends interior grid points toward their neighbors, preserving the boundary and affine grids. */
export const smoothGridPoints = (options: SmoothGridPointsOptions): number[] => {
  const stride = options.columns + 1
  return options.controlPoints.map((coordinate, index) => {
    const point = Math.floor(index / 2)
    const column = point % stride
    const row = Math.floor(point / stride)
    if (column === 0 || column === options.columns || row === 0 || row === options.rows) {
      return coordinate
    }
    const local = {x: options.controlPoints[point * 2]!, y: options.controlPoints[point * 2 + 1]!}
    const position = options.transform?.(local) ?? local
    const distance = Math.hypot(position.x - options.center.x, position.y - options.center.y)
    const weight =
      clamp(1 - distance / Math.max(1, options.radius), 0, 1) * clamp(options.strength, 0, 1)
    const axis = index % 2
    const neighbors = [point - 1, point + 1, point - stride, point + stride]
    const average =
      neighbors.reduce((sum, neighbor) => sum + options.controlPoints[neighbor * 2 + axis]!, 0) /
      neighbors.length
    return coordinate + (average - coordinate) * weight
  })
}
