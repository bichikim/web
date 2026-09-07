import type {PuppetDeformerCurveHandle, PuppetSceneDeformerNode} from '../../player'
import {sampleDeformerSurface} from '../../deformation/internal/surface'

export const MAXIMUM_GRID_DIVISIONS = 32
export const MINIMUM_GRID_DIVISIONS = 1

interface ResampleGridControlPointsOptions {
  readonly columns: number
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly nextColumns: number
  readonly nextRows: number
  readonly rows: number
}

const BEZIER_TANGENT_MULTIPLIER = 3
const GRID_LINE_EPSILON = 0.000_000_001

export const createDeformerControlPoints = (
  node: Pick<PuppetSceneDeformerNode, 'bounds' | 'columns' | 'rows'>,
) => {
  const points: number[] = []

  for (let row = 0; row <= node.rows; row += 1) {
    for (let column = 0; column <= node.columns; column += 1) {
      points.push(
        node.bounds.x + (node.bounds.width * column) / node.columns,
        node.bounds.y + (node.bounds.height * row) / node.rows,
      )
    }
  }

  return points
}

const createSurfaceNode = (options: ResampleGridControlPointsOptions): PuppetSceneDeformerNode => ({
  bounds: {height: 1, width: 1, x: 0, y: 0},
  children: [],
  columns: options.columns,
  controlPoints: options.controlPoints,
  curveHandles: options.curveHandles,
  id: 'resample',
  kind: 'deformer',
  locked: false,
  name: 'Resample',
  rows: options.rows,
  visible: true,
})

export const isGridDivisionCount = (value: number) =>
  Number.isInteger(value) && value >= MINIMUM_GRID_DIVISIONS && value <= MAXIMUM_GRID_DIVISIONS

export const resampleGridControlPoints = (options: ResampleGridControlPointsOptions) => {
  const points: number[] = []
  const node = createSurfaceNode(options)

  for (let row = 0; row <= options.nextRows; row += 1) {
    for (let column = 0; column <= options.nextColumns; column += 1) {
      const {point} = sampleDeformerSurface({
        horizontalProgress: column / options.nextColumns,
        node,
        verticalProgress: row / options.nextRows,
      })
      points.push(point.x, point.y)
    }
  }

  return points
}

interface ResampleGridCurveHandlesOptions extends ResampleGridControlPointsOptions {
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
}

const isGridLine = (position: number) =>
  Math.abs(position - Math.round(position)) < GRID_LINE_EPSILON

const hasHandle = (pointIndices: ReadonlySet<number>, pointIndex: number) =>
  pointIndices.has(pointIndex)

const shouldCreateHorizontalHandle = (
  options: ResampleGridCurveHandlesOptions,
  pointIndices: ReadonlySet<number>,
  column: number,
  row: number,
) => {
  if (options.columns === options.nextColumns) {
    return false
  }

  const sourceColumn = (column / options.nextColumns) * options.columns
  const sourceRow = (row / options.nextRows) * options.rows
  const segmentColumn = Math.min(options.columns - 1, Math.floor(sourceColumn))

  if (isGridLine(sourceRow)) {
    const sourceRowIndex = Math.round(sourceRow)
    const leftIndex = sourceRowIndex * (options.columns + 1) + segmentColumn
    return hasHandle(pointIndices, leftIndex) || hasHandle(pointIndices, leftIndex + 1)
  }

  const segmentRow = Math.min(options.rows - 1, Math.floor(sourceRow))
  const topLeftIndex = segmentRow * (options.columns + 1) + segmentColumn
  const bottomLeftIndex = (segmentRow + 1) * (options.columns + 1) + segmentColumn
  return (
    hasHandle(pointIndices, topLeftIndex) ||
    hasHandle(pointIndices, topLeftIndex + 1) ||
    hasHandle(pointIndices, bottomLeftIndex) ||
    hasHandle(pointIndices, bottomLeftIndex + 1)
  )
}

const shouldCreateVerticalHandle = (
  options: ResampleGridCurveHandlesOptions,
  pointIndices: ReadonlySet<number>,
  column: number,
  row: number,
) => {
  if (options.rows === options.nextRows) {
    return false
  }

  const sourceColumn = (column / options.nextColumns) * options.columns
  const sourceRow = (row / options.nextRows) * options.rows
  const segmentRow = Math.min(options.rows - 1, Math.floor(sourceRow))

  if (isGridLine(sourceColumn)) {
    const sourceColumnIndex = Math.round(sourceColumn)
    const topIndex = segmentRow * (options.columns + 1) + sourceColumnIndex
    const bottomIndex = topIndex + options.columns + 1
    return hasHandle(pointIndices, topIndex) || hasHandle(pointIndices, bottomIndex)
  }

  const segmentColumn = Math.min(options.columns - 1, Math.floor(sourceColumn))
  const topLeftIndex = segmentRow * (options.columns + 1) + segmentColumn
  const bottomLeftIndex = (segmentRow + 1) * (options.columns + 1) + segmentColumn
  return (
    hasHandle(pointIndices, topLeftIndex) ||
    hasHandle(pointIndices, topLeftIndex + 1) ||
    hasHandle(pointIndices, bottomLeftIndex) ||
    hasHandle(pointIndices, bottomLeftIndex + 1)
  )
}

export const resampleGridCurveHandles = (
  options: ResampleGridCurveHandlesOptions,
): ReadonlyArray<PuppetDeformerCurveHandle> | undefined => {
  if (options.curveHandles === undefined) {
    return undefined
  }

  const handles: PuppetDeformerCurveHandle[] = []
  const node = createSurfaceNode(options)
  const pointIndices = new Set(options.curveHandles.map((handle) => handle.pointIndex))
  const mappedPointIndices = new Set(
    options.curveHandles.map((handle) => {
      const sourceColumn = handle.pointIndex % (options.columns + 1)
      const sourceRow = Math.floor(handle.pointIndex / (options.columns + 1))
      const nextColumn = Math.round((sourceColumn / options.columns) * options.nextColumns)
      const nextRow = Math.round((sourceRow / options.rows) * options.nextRows)
      return nextRow * (options.nextColumns + 1) + nextColumn
    }),
  )

  for (let row = 0; row <= options.nextRows; row += 1) {
    for (let column = 0; column <= options.nextColumns; column += 1) {
      const pointIndex = row * (options.nextColumns + 1) + column
      if (
        mappedPointIndices.has(pointIndex) ||
        shouldCreateHorizontalHandle(options, pointIndices, column, row) ||
        shouldCreateVerticalHandle(options, pointIndices, column, row)
      ) {
        const sample = sampleDeformerSurface({
          horizontalProgress: column / options.nextColumns,
          node,
          verticalProgress: row / options.nextRows,
        })
        handles.push({
          horizontal: {
            x:
              sample.point.x +
              (sample.horizontalTangent.x * options.columns) /
                options.nextColumns /
                BEZIER_TANGENT_MULTIPLIER,
            y:
              sample.point.y +
              (sample.horizontalTangent.y * options.columns) /
                options.nextColumns /
                BEZIER_TANGENT_MULTIPLIER,
          },
          pointIndex,
          vertical: {
            x:
              sample.point.x +
              (sample.verticalTangent.x * options.rows) /
                options.nextRows /
                BEZIER_TANGENT_MULTIPLIER,
            y:
              sample.point.y +
              (sample.verticalTangent.y * options.rows) /
                options.nextRows /
                BEZIER_TANGENT_MULTIPLIER,
          },
        })
      }
    }
  }

  return handles
}

interface ResampleDeformerGridOptions {
  readonly columns: number
  readonly node: PuppetSceneDeformerNode
  readonly rows: number
}

export const resampleDeformerGrid = (options: ResampleDeformerGridOptions) => {
  const resampleOptions = {
    columns: options.node.columns,
    controlPoints: options.node.controlPoints,
    curveHandles: options.node.curveHandles,
    nextColumns: options.columns,
    nextRows: options.rows,
    rows: options.node.rows,
  }

  return {
    ...options.node,
    columns: options.columns,
    controlPoints: resampleGridControlPoints(resampleOptions),
    curveHandles: resampleGridCurveHandles(resampleOptions),
    rows: options.rows,
  }
}
