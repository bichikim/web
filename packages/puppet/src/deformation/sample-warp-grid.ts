import type {PuppetDeformerShape, PuppetPoint} from '../player/document'
import {
  type CoordinateReader,
  getCoordinateReader,
  isDeferredCoordinates,
} from './internal/deferred-coordinates'

const EXTENSION = 2
const CENTER = 0.5
const CORNER_COUNT = 4

const cellIndex = (value: number, divisions: number): number =>
  value < 0
    ? 0
    : value > 1
      ? divisions + 1
      : Math.min(divisions - 1, Math.floor(value * divisions)) + 1

const cellProgress = (value: number, divisions: number, cell: number): number =>
  value < 0
    ? (value + EXTENSION) / EXTENSION
    : value > 1
      ? (value - 1) / EXTENSION
      : value * divisions - (cell - 1)

const cellStart = (cell: number, divisions: number): number =>
  cell === 0 ? -EXTENSION : cell === divisions + 1 ? 1 : (cell - 1) / divisions

const cellEnd = (cell: number, divisions: number): number =>
  cell === 0 ? 0 : cell === divisions + 1 ? 1 + EXTENSION : cell / divisions

const createCoordinateReader = (
  node: PuppetDeformerShape,
  read = getCoordinateReader(node.controlPoints),
) => {
  return (x: number, y: number, axis: number): number => {
    if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
      const offset =
        (Math.round(y * node.rows) * (node.columns + 1) + Math.round(x * node.columns)) * 2
      return read(offset + axis)!
    }
    const topLeft = read(axis)!
    const topRight = read(node.columns * 2 + axis)!
    const bottomLeft = read(node.rows * (node.columns + 1) * 2 + axis)!
    const bottomRight = read(((node.rows + 1) * (node.columns + 1) - 1) * 2 + axis)!
    const center = (topLeft + topRight + bottomLeft + bottomRight) / CORNER_COUNT
    return (
      center +
      ((x - CENTER) * (topRight + bottomRight - topLeft - bottomLeft)) / 2 +
      ((y - CENTER) * (bottomLeft + bottomRight - topLeft - topRight)) / 2
    )
  }
}

interface WarpGrid {
  readonly cells: Map<number, {readonly values: number[]; version: number}>
  readonly coordinate: (x: number, y: number, axis: number) => number
  version: number
}

const gridsByShape = new WeakMap<PuppetDeformerShape, WarpGrid>()

// eslint-disable-next-line max-params -- Refill owned cell storage without allocating a progress object.
const sampleCellCorners = (
  node: PuppetDeformerShape,
  coordinate: WarpGrid['coordinate'],
  horizontal: number,
  vertical: number,
  values: number[] = [],
): number[] => {
  const left = cellStart(horizontal, node.columns)
  const right = cellEnd(horizontal, node.columns)
  const top = cellStart(vertical, node.rows)
  const bottom = cellEnd(vertical, node.rows)
  values[0] = coordinate(left, top, 0)
  values[1] = coordinate(right, top, 0)
  values[2] = coordinate(left, bottom, 0)
  values[3] = coordinate(right, bottom, 0)
  values[4] = coordinate(left, top, 1)
  values[5] = coordinate(right, top, 1)
  values[6] = coordinate(left, bottom, 1)
  values[7] = coordinate(right, bottom, 1)
  return values
}

const getCellCorners = (
  node: PuppetDeformerShape,
  horizontal: number,
  vertical: number,
  suppliedGrid?: WarpGrid,
): ReadonlyArray<number> => {
  // Raw shape callers can edit their input arrays between queries; only frame buffers cache cells.
  if (suppliedGrid === undefined && !isDeferredCoordinates(node.controlPoints)) {
    return sampleCellCorners(node, createCoordinateReader(node), horizontal, vertical)
  }
  let grid = suppliedGrid ?? gridsByShape.get(node)
  if (grid === undefined) {
    grid = {cells: new Map(), coordinate: createCoordinateReader(node), version: 0}
    gridsByShape.set(node, grid)
  }
  const key = vertical * (node.columns + 2) + horizontal
  let cell = grid.cells.get(key)
  if (cell === undefined) {
    cell = {
      values: sampleCellCorners(node, grid.coordinate, horizontal, vertical),
      version: grid.version,
    }
    grid.cells.set(key, cell)
  } else if (cell.version !== grid.version) {
    sampleCellCorners(node, grid.coordinate, horizontal, vertical, cell.values)
    cell.version = grid.version
  }
  return cell.values
}

// eslint-disable-next-line max-params -- Numerical kernel avoids allocating coordinate/progress objects.
const interpolateCorners = (
  topLeft: number,
  topRight: number,
  bottomLeft: number,
  bottomRight: number,
  x: number,
  y: number,
  interpolation: PuppetDeformerShape['interpolation'],
): number => {
  if (interpolation === 'bilinear') {
    return (
      topLeft * (1 - x) * (1 - y) +
      topRight * x * (1 - y) +
      bottomLeft * (1 - x) * y +
      bottomRight * x * y
    )
  }
  if (interpolation === 'triangles-mirrored') {
    return x >= y
      ? topLeft + (topRight - topLeft) * x + (bottomRight - topRight) * y
      : topLeft + (bottomRight - bottomLeft) * x + (bottomLeft - topLeft) * y
  }
  return x + y <= 1
    ? topLeft + (topRight - topLeft) * x + (bottomLeft - topLeft) * y
    : bottomRight + (bottomLeft - bottomRight) * (1 - x) + (topRight - bottomRight) * (1 - y)
}

// eslint-disable-next-line max-params -- Preserve a scalar-only interface for the cell kernel.
const interpolateCell = (
  cell: ReadonlyArray<number>,
  offset: number,
  x: number,
  y: number,
  interpolation: PuppetDeformerShape['interpolation'],
): number =>
  interpolateCorners(
    cell[offset]!,
    cell[offset + 1]!,
    cell[offset + 2]!,
    cell[offset + CORNER_COUNT - 1]!,
    x,
    y,
    interpolation,
  )

const samplePoint = (
  node: PuppetDeformerShape,
  point: PuppetPoint,
  weight?: number,
  grid?: WarpGrid,
): PuppetPoint => {
  if (weight === 0) {
    return point
  }
  const horizontal = (point.x - node.bounds.x) / node.bounds.width
  const vertical = (point.y - node.bounds.y) / node.bounds.height
  const column = cellIndex(horizontal, node.columns)
  const row = cellIndex(vertical, node.rows)
  const cell = getCellCorners(node, column, row, grid)
  const x = cellProgress(horizontal, node.columns, column)
  const y = cellProgress(vertical, node.rows, row)
  const horizontalValue = interpolateCell(cell, 0, x, y, node.interpolation)
  const verticalValue = interpolateCell(cell, CORNER_COUNT, x, y, node.interpolation)
  return weight === undefined
    ? {x: horizontalValue, y: verticalValue}
    : {
        x: point.x + (horizontalValue - point.x) * weight,
        y: point.y + (verticalValue - point.y) * weight,
      }
}

/** SDK의 가상 외곽 격자를 포함해 삼각형 또는 사각형 셀을 보간한다. */
export const sampleWarpGrid = (node: PuppetDeformerShape, point: PuppetPoint): PuppetPoint =>
  samplePoint(node, point)

/** Samples and weights a native grid in the same arithmetic order as deformer point transforms. */
export const sampleWeightedWarpGrid = (
  node: PuppetDeformerShape,
  point: PuppetPoint,
  weight: number,
): PuppetPoint => samplePoint(node, point, weight)

interface CreateWarpGridSamplerOptions {
  /** Borrowed grid layout; dimensions, bounds and interpolation stay constant for this sampler. */
  readonly node: PuppetDeformerShape
  /** Owner-scoped coordinate storage; call reset after changing its inputs. */
  readonly points: WarpPointBuffer
}

export interface WarpPointBuffer {
  /** Interleaved x/y coordinates, updated by resolve without replacing the storage. */
  readonly coordinates: ArrayLike<number>
  /** Resolves both coordinates for one point before the sampler reads them. */
  resolve(pointIndex: number): void
}

export interface WarpPointOutput {
  x: number
  y: number
}

export interface WarpGridSampler {
  /** Discards sampled cells after the owner changes its coordinate inputs. */
  reset(): void
  /** Samples the current grid; omitted weight returns its unweighted position. */
  sample(point: PuppetPoint, weight?: number): PuppetPoint
  /** Writes caller-owned storage; prior sample() snapshots remain unchanged. */
  sampleInto(point: PuppetPoint, output: WarpPointOutput, weight?: number): void
}

/** An owner-scoped grid cache with explicit invalidation for mutable runtime coordinates. */
export const createWarpGridSampler = (options: CreateWarpGridSamplerOptions): WarpGridSampler => {
  const {node, points} = options
  const grid: WarpGrid = {
    cells: new Map(),
    coordinate: createCoordinateReader(node, (index) => {
      points.resolve(Math.floor(index / 2))
      return points.coordinates[index]
    }),
    version: 0,
  }
  const sampleInto = (point: PuppetPoint, output: WarpPointOutput, weight?: number): void => {
    if (weight === 0) {
      output.x = point.x
      output.y = point.y
      return
    }
    const horizontal = (point.x - node.bounds.x) / node.bounds.width
    const vertical = (point.y - node.bounds.y) / node.bounds.height
    const column = cellIndex(horizontal, node.columns)
    const row = cellIndex(vertical, node.rows)
    if (column === 0 || column > node.columns || row === 0 || row > node.rows) {
      const sampled = samplePoint(node, point, weight, grid)
      output.x = sampled.x
      output.y = sampled.y
      return
    }
    const topLeft = ((row - 1) * (node.columns + 1) + column - 1) * 2
    const topRight = topLeft + 2
    const bottomLeft = topLeft + (node.columns + 1) * 2
    const bottomRight = bottomLeft + 2
    points.resolve(topLeft / 2)
    points.resolve(topRight / 2)
    points.resolve(bottomLeft / 2)
    points.resolve(bottomRight / 2)
    const values = points.coordinates
    const x = cellProgress(horizontal, node.columns, column)
    const y = cellProgress(vertical, node.rows, row)
    const horizontalValue = interpolateCorners(
      values[topLeft]!,
      values[topRight]!,
      values[bottomLeft]!,
      values[bottomRight]!,
      x,
      y,
      node.interpolation,
    )
    const verticalValue = interpolateCorners(
      values[topLeft + 1]!,
      values[topRight + 1]!,
      values[bottomLeft + 1]!,
      values[bottomRight + 1]!,
      x,
      y,
      node.interpolation,
    )
    output.x =
      weight === undefined ? horizontalValue : point.x + (horizontalValue - point.x) * weight
    output.y = weight === undefined ? verticalValue : point.y + (verticalValue - point.y) * weight
  }
  return {
    reset: () => {
      grid.version += 1
    },
    sample(point, weight) {
      if (weight === 0) {
        return point
      }
      const output = {x: 0, y: 0}
      sampleInto(point, output, weight)
      return output
    },
    sampleInto,
  }
}
