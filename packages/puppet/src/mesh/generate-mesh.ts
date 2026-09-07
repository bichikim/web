import type {PuppetMesh} from '../player/document'
import {deriveBoundaryLoops} from './boundary'

export interface PixelData {
  readonly data: Uint8ClampedArray
  readonly height: number
  readonly width: number
}

export interface GenerateMeshOptions {
  readonly alphaThreshold?: number
  readonly cellSize?: number
  readonly pixels: PixelData
}

export type GenerateMeshErrorCode =
  | 'invalid-alpha-threshold'
  | 'invalid-cell-size'
  | 'invalid-pixel-data'
  | 'no-opaque-pixels'

export interface GenerateMeshFailure {
  readonly error: {readonly code: GenerateMeshErrorCode}
  readonly ok: false
}

export interface GenerateMeshSuccess {
  readonly mesh: PuppetMesh
  readonly ok: true
}

export type GenerateMeshResult = GenerateMeshFailure | GenerateMeshSuccess

interface Bounds {
  readonly bottom: number
  readonly left: number
  readonly right: number
  readonly top: number
}

interface GridCell {
  readonly xIndex: number
  readonly yIndex: number
}

const ALPHA_OFFSET = 3
const COLOR_CHANNEL_COUNT = 4
const DEFAULT_ALPHA_THRESHOLD = 16
const DEFAULT_GRID_DIVISIONS = 12
const MINIMUM_CELL_SIZE = 4
const MAXIMUM_ALPHA = 255
const CELL_NEIGHBOR_OFFSETS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

const getAlpha = (pixels: PixelData, x: number, y: number) =>
  pixels.data[(y * pixels.width + x) * COLOR_CHANNEL_COUNT + ALPHA_OFFSET]

const getOpaqueBounds = (pixels: PixelData, alphaThreshold: number): Bounds | undefined => {
  let left = pixels.width
  let top = pixels.height
  let right = -1
  let bottom = -1

  for (let y = 0; y < pixels.height; y += 1) {
    for (let x = 0; x < pixels.width; x += 1) {
      if (getAlpha(pixels, x, y) > alphaThreshold) {
        left = Math.min(left, x)
        top = Math.min(top, y)
        right = Math.max(right, x)
        bottom = Math.max(bottom, y)
      }
    }
  }

  return right < left || bottom < top ? undefined : {bottom, left, right, top}
}

const createGridCoordinates = (start: number, end: number, cellSize: number) => {
  const coordinates = [start]

  for (let coordinate = start + cellSize; coordinate < end; coordinate += cellSize) {
    coordinates.push(coordinate)
  }

  coordinates.push(end)

  return coordinates
}

const hasOpaquePixel = (pixels: PixelData, alphaThreshold: number, bounds: Bounds) => {
  for (let y = bounds.top; y < bounds.bottom; y += 1) {
    for (let x = bounds.left; x < bounds.right; x += 1) {
      if (getAlpha(pixels, x, y) > alphaThreshold) {
        return true
      }
    }
  }

  return false
}

const getCellKey = (xIndex: number, yIndex: number) => `${xIndex}:${yIndex}`

const getCellBounds = (
  xCoordinates: ReadonlyArray<number>,
  yCoordinates: ReadonlyArray<number>,
  cell: GridCell,
): Bounds | undefined => {
  const left = xCoordinates[cell.xIndex]
  const top = yCoordinates[cell.yIndex]
  const right = xCoordinates[cell.xIndex + 1]
  const bottom = yCoordinates[cell.yIndex + 1]

  return left === undefined || top === undefined || right === undefined || bottom === undefined
    ? undefined
    : {bottom, left, right, top}
}

const getOpaqueCells = (
  pixels: PixelData,
  alphaThreshold: number,
  xCoordinates: ReadonlyArray<number>,
  yCoordinates: ReadonlyArray<number>,
) => {
  const opaqueCells = new Set<string>()

  for (let yIndex = 0; yIndex < yCoordinates.length - 1; yIndex += 1) {
    for (let xIndex = 0; xIndex < xCoordinates.length - 1; xIndex += 1) {
      const bounds = getCellBounds(xCoordinates, yCoordinates, {xIndex, yIndex})

      if (bounds !== undefined && hasOpaquePixel(pixels, alphaThreshold, bounds)) {
        opaqueCells.add(getCellKey(xIndex, yIndex))
      }
    }
  }

  return opaqueCells
}

const getExteriorCells = (opaqueCells: ReadonlySet<string>, width: number, height: number) => {
  const exteriorCells = new Set<string>()
  const pendingCells: GridCell[] = []
  const addExteriorCell = (cell: GridCell) => {
    const insideGrid =
      cell.xIndex >= 0 && cell.xIndex < width && cell.yIndex >= 0 && cell.yIndex < height
    const key = getCellKey(cell.xIndex, cell.yIndex)

    if (insideGrid && !opaqueCells.has(key) && !exteriorCells.has(key)) {
      exteriorCells.add(key)
      pendingCells.push(cell)
    }
  }

  for (let xIndex = 0; xIndex < width; xIndex += 1) {
    addExteriorCell({xIndex, yIndex: 0})
    addExteriorCell({xIndex, yIndex: height - 1})
  }

  for (let yIndex = 0; yIndex < height; yIndex += 1) {
    addExteriorCell({xIndex: 0, yIndex})
    addExteriorCell({xIndex: width - 1, yIndex})
  }

  for (let pendingIndex = 0; pendingIndex < pendingCells.length; pendingIndex += 1) {
    const cell = pendingCells[pendingIndex]

    if (cell !== undefined) {
      for (const [xOffset, yOffset] of CELL_NEIGHBOR_OFFSETS) {
        addExteriorCell({xIndex: cell.xIndex + xOffset, yIndex: cell.yIndex + yOffset})
      }
    }
  }

  return exteriorCells
}

const hasValidPixels = (pixels: PixelData) =>
  Number.isInteger(pixels.width) &&
  pixels.width > 0 &&
  Number.isInteger(pixels.height) &&
  pixels.height > 0 &&
  pixels.data.length === pixels.width * pixels.height * COLOR_CHANNEL_COUNT

const hasValidAlphaThreshold = (alphaThreshold: number) =>
  Number.isInteger(alphaThreshold) && alphaThreshold >= 0 && alphaThreshold <= MAXIMUM_ALPHA

const hasValidCellSize = (cellSize: number) => Number.isFinite(cellSize) && cellSize > 0

export const generateMesh = (options: GenerateMeshOptions): GenerateMeshResult => {
  const {pixels} = options
  const alphaThreshold = options.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD
  const defaultCellSize = Math.max(
    MINIMUM_CELL_SIZE,
    Math.ceil(Math.max(pixels.width, pixels.height) / DEFAULT_GRID_DIVISIONS),
  )
  const cellSize = options.cellSize ?? defaultCellSize

  if (!hasValidPixels(pixels)) {
    return {error: {code: 'invalid-pixel-data'}, ok: false}
  }

  if (!hasValidAlphaThreshold(alphaThreshold)) {
    return {error: {code: 'invalid-alpha-threshold'}, ok: false}
  }

  if (!hasValidCellSize(cellSize)) {
    return {error: {code: 'invalid-cell-size'}, ok: false}
  }

  const bounds = getOpaqueBounds(pixels, alphaThreshold)

  if (bounds === undefined) {
    return {error: {code: 'no-opaque-pixels'}, ok: false}
  }

  const right = Math.min(bounds.right + 1, pixels.width)
  const bottom = Math.min(bounds.bottom + 1, pixels.height)
  const xCoordinates = createGridCoordinates(bounds.left, right, cellSize)
  const yCoordinates = createGridCoordinates(bounds.top, bottom, cellSize)
  const opaqueCells = getOpaqueCells(pixels, alphaThreshold, xCoordinates, yCoordinates)
  const exteriorCells = getExteriorCells(
    opaqueCells,
    xCoordinates.length - 1,
    yCoordinates.length - 1,
  )
  const vertices: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const vertexByCoordinate = new Map<string, number>()

  const getVertexIndex = (x: number, y: number) => {
    const key = `${x}:${y}`
    const existingIndex = vertexByCoordinate.get(key)

    if (existingIndex !== undefined) {
      return existingIndex
    }

    const vertexIndex = vertices.length / 2
    vertexByCoordinate.set(key, vertexIndex)
    vertices.push(x, y)
    uvs.push(x / pixels.width, y / pixels.height)

    return vertexIndex
  }

  for (let yIndex = 0; yIndex < yCoordinates.length - 1; yIndex += 1) {
    for (let xIndex = 0; xIndex < xCoordinates.length - 1; xIndex += 1) {
      const left = xCoordinates[xIndex]
      const top = yCoordinates[yIndex]
      const cellRight = xCoordinates[xIndex + 1]
      const cellBottom = yCoordinates[yIndex + 1]

      if (
        left !== undefined &&
        top !== undefined &&
        cellRight !== undefined &&
        cellBottom !== undefined &&
        !exteriorCells.has(getCellKey(xIndex, yIndex))
      ) {
        const topLeft = getVertexIndex(left, top)
        const topRight = getVertexIndex(cellRight, top)
        const bottomRight = getVertexIndex(cellRight, cellBottom)
        const bottomLeft = getVertexIndex(left, cellBottom)

        indices.push(topLeft, topRight, bottomRight, topLeft, bottomRight, bottomLeft)
      }
    }
  }

  return {
    mesh: {
      boundaryLoops: deriveBoundaryLoops({indices}),
      indices,
      uvs,
      vertices,
    },
    ok: true,
  }
}
