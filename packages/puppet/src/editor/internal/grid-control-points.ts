import type {PuppetDeformerCurveHandle, PuppetSceneDeformerNode} from '../../player'

export const MAXIMUM_GRID_DIVISIONS = 32
export const MINIMUM_GRID_DIVISIONS = 1

interface ResampleGridControlPointsOptions {
  readonly columns: number
  readonly controlPoints: ReadonlyArray<number>
  readonly nextColumns: number
  readonly nextRows: number
  readonly rows: number
}

const COORDINATES_PER_POINT = 2

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

const getPoint = (
  options: Pick<ResampleGridControlPointsOptions, 'columns' | 'controlPoints'>,
  column: number,
  row: number,
) => {
  const coordinateIndex = (row * (options.columns + 1) + column) * COORDINATES_PER_POINT
  return {
    x: options.controlPoints[coordinateIndex] ?? 0,
    y: options.controlPoints[coordinateIndex + 1] ?? 0,
  }
}

const interpolate = (first: number, second: number, progress: number) =>
  first + (second - first) * progress

const samplePoint = (
  options: ResampleGridControlPointsOptions,
  horizontalProgress: number,
  verticalProgress: number,
) => {
  const horizontalPosition = horizontalProgress * options.columns
  const verticalPosition = verticalProgress * options.rows
  const column = Math.min(options.columns - 1, Math.floor(horizontalPosition))
  const row = Math.min(options.rows - 1, Math.floor(verticalPosition))
  const columnProgress = horizontalPosition - column
  const rowProgress = verticalPosition - row
  const topLeft = getPoint(options, column, row)
  const topRight = getPoint(options, column + 1, row)
  const bottomLeft = getPoint(options, column, row + 1)
  const bottomRight = getPoint(options, column + 1, row + 1)
  const topX = interpolate(topLeft.x, topRight.x, columnProgress)
  const topY = interpolate(topLeft.y, topRight.y, columnProgress)
  const bottomX = interpolate(bottomLeft.x, bottomRight.x, columnProgress)
  const bottomY = interpolate(bottomLeft.y, bottomRight.y, columnProgress)

  return {
    x: interpolate(topX, bottomX, rowProgress),
    y: interpolate(topY, bottomY, rowProgress),
  }
}

export const isGridDivisionCount = (value: number) =>
  Number.isInteger(value) && value >= MINIMUM_GRID_DIVISIONS && value <= MAXIMUM_GRID_DIVISIONS

export const resampleGridControlPoints = (options: ResampleGridControlPointsOptions) => {
  const points: number[] = []

  for (let row = 0; row <= options.nextRows; row += 1) {
    for (let column = 0; column <= options.nextColumns; column += 1) {
      const point = samplePoint(options, column / options.nextColumns, row / options.nextRows)
      points.push(point.x, point.y)
    }
  }

  return points
}

interface ResampleGridCurveHandlesOptions extends ResampleGridControlPointsOptions {
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
}

export const resampleGridCurveHandles = (
  options: ResampleGridCurveHandlesOptions,
): ReadonlyArray<PuppetDeformerCurveHandle> | undefined => {
  if (options.curveHandles === undefined) {
    return undefined
  }

  const nextControlPoints = resampleGridControlPoints(options)
  const handlesByPoint = new Map<number, PuppetDeformerCurveHandle>()

  for (const handle of options.curveHandles) {
    const column = handle.pointIndex % (options.columns + 1)
    const row = Math.floor(handle.pointIndex / (options.columns + 1))
    const nextColumn = Math.round((column / options.columns) * options.nextColumns)
    const nextRow = Math.round((row / options.rows) * options.nextRows)
    const nextPointIndex = nextRow * (options.nextColumns + 1) + nextColumn
    const point = getPoint(options, column, row)
    const nextPoint = getPoint(
      {columns: options.nextColumns, controlPoints: nextControlPoints},
      nextColumn,
      nextRow,
    )

    if (!handlesByPoint.has(nextPointIndex)) {
      handlesByPoint.set(nextPointIndex, {
        horizontal: {
          x:
            nextPoint.x + (handle.horizontal.x - point.x) * (options.columns / options.nextColumns),
          y:
            nextPoint.y + (handle.horizontal.y - point.y) * (options.columns / options.nextColumns),
        },
        pointIndex: nextPointIndex,
        vertical: {
          x: nextPoint.x + (handle.vertical.x - point.x) * (options.rows / options.nextRows),
          y: nextPoint.y + (handle.vertical.y - point.y) * (options.rows / options.nextRows),
        },
      })
    }
  }

  return [...handlesByPoint.values()].sort((first, second) => first.pointIndex - second.pointIndex)
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
    nextColumns: options.columns,
    nextRows: options.rows,
    rows: options.node.rows,
  }

  return {
    ...options.node,
    columns: options.columns,
    controlPoints: resampleGridControlPoints(resampleOptions),
    curveHandles: resampleGridCurveHandles({
      ...resampleOptions,
      curveHandles: options.node.curveHandles,
    }),
    rows: options.rows,
  }
}
