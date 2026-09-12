import type {PuppetDeformerCurveHandle, PuppetSceneDeformerNode} from '../../player'
import {sampleDeformerSurface} from '../../deformation/internal/surface'
import {getSurfaceWeights} from '../../deformation/internal/get-surface-weights'

export const MAXIMUM_GRID_DIVISIONS = 32
export const MINIMUM_GRID_DIVISIONS = 1
export const SURFACE_RESAMPLE_ERROR_RATIO = 0.04

interface ResampleGridControlPointsOptions {
  readonly columns: number
  readonly controlPoints: ReadonlyArray<number>
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly maximumError?: number
  readonly nextColumns: number
  readonly nextRows: number
  readonly rows: number
}

const GRID_LINE_EPSILON = 0.000_000_001
const BEZIER_TANGENT_MULTIPLIER = 3

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

interface SurfaceResidual {
  x: number
  y: number
  importance?: number
}

interface HandleInfluence {
  readonly residual: SurfaceResidual
  readonly weight: number
}

const SURFACE_SAMPLE_DIVISIONS = 4
const SURFACE_SAMPLE_PROGRESS = Array.from(
  {length: SURFACE_SAMPLE_DIVISIONS + 1},
  (_, index) => index / SURFACE_SAMPLE_DIVISIONS,
)
const FIT_ITERATIONS = 40
// Cubic samples at 0, 1/4, 3/4, 1 bound each Bezier coefficient by 5 times
// the maximum sample norm; the two-dimensional tensor product gives 25.
const SURFACE_ERROR_BOUND_MULTIPLIER = 25

interface HandleWeights {
  readonly pointIndex: number
  readonly horizontalWeight: number
  readonly verticalWeight: number
}

const addHandleInfluences = (
  influences: HandleInfluence[][],
  residual: SurfaceResidual,
  weights: ReadonlyArray<HandleWeights>,
  indices: ReadonlyMap<number, number>,
) => {
  for (const {pointIndex, horizontalWeight, verticalWeight} of weights) {
    const index = indices.get(pointIndex)
    if (index !== undefined) {
      influences[index * 2].push({residual, weight: BEZIER_TANGENT_MULTIPLIER * horizontalWeight})
      influences[index * 2 + 1].push({residual, weight: BEZIER_TANGENT_MULTIPLIER * verticalWeight})
    }
  }
}

interface EquationWeight {
  readonly index: number
  readonly weight: number
}

interface SurfaceEquation {
  readonly residual: SurfaceResidual
  readonly weights: EquationWeight[]
}

interface FitSystem {
  readonly equations: ReadonlyArray<SurfaceEquation>
  readonly matrix: Float64Array
  readonly neighbors: ReadonlyArray<ReadonlyArray<number>>
  readonly radius: number
  readonly stride: number
}

const createFitSystem = (influences: ReadonlyArray<ReadonlyArray<HandleInfluence>>): FitSystem => {
  const equations = new Map<SurfaceResidual, SurfaceEquation>()
  for (const [index, entries] of influences.entries()) {
    for (const entry of entries) {
      const equation = equations.get(entry.residual) ?? {residual: entry.residual, weights: []}
      if (entry.weight !== 0) {
        equation.weights.push({index, weight: entry.weight})
      }
      equations.set(entry.residual, equation)
    }
  }
  const neighbors = influences.map(() => new Set<number>())
  let radius = 0
  for (const equation of equations.values()) {
    for (const first of equation.weights) {
      for (const second of equation.weights) {
        neighbors[first.index].add(second.index)
        radius = Math.max(radius, Math.abs(first.index - second.index))
      }
    }
  }
  const stride = radius * 2 + 1
  return {
    equations: Array.from(equations.values()),
    matrix: new Float64Array(influences.length * stride),
    neighbors: neighbors.map((indices) => Array.from(indices)),
    radius,
    stride,
  }
}

const fitHandleOffsets = (system: FitSystem, offsets: SurfaceResidual[]) => {
  system.matrix.fill(0)
  const rightX = new Float64Array(offsets.length)
  const rightY = new Float64Array(offsets.length)
  for (const {residual, weights} of system.equations) {
    for (const first of weights) {
      const weight = first.weight * (residual.importance ?? 1)
      rightX[first.index] += weight * residual.x
      rightY[first.index] += weight * residual.y
      const origin = first.index * system.stride + system.radius - first.index
      for (const second of weights) {
        system.matrix[origin + second.index] += weight * second.weight
      }
    }
  }
  const delta = solveFitSystem(system, rightX, rightY)
  for (const {residual, weights} of system.equations) {
    for (const {index, weight} of weights) {
      residual.x -= weight * delta.x[index]
      residual.y -= weight * delta.y[index]
    }
  }
  for (const [index, offset] of offsets.entries()) {
    offset.x += delta.x[index]
    offset.y += delta.y[index]
  }
}

const solveFitSystem = (system: FitSystem, rightX: Float64Array, rightY: Float64Array) => {
  const x = new Float64Array(rightX.length)
  const y = new Float64Array(rightY.length)
  for (let iteration = 0; iteration < FIT_ITERATIONS; iteration += 1) {
    for (const [index, neighbors] of system.neighbors.entries()) {
      const origin = index * system.stride + system.radius - index
      const diagonal = system.matrix[origin + index]
      if (diagonal > 0) {
        let residualX = rightX[index]
        let residualY = rightY[index]
        for (const neighbor of neighbors) {
          const weight = system.matrix[origin + neighbor]
          residualX -= weight * x[neighbor]
          residualY -= weight * y[neighbor]
        }
        x[index] += residualX / diagonal
        y[index] += residualY / diagonal
      }
    }
  }
  return {x, y}
}

const getHandleOffsets = (
  influences: ReadonlyArray<ReadonlyArray<HandleInfluence>>,
  maximumError: number,
) => {
  const offsets = influences.map(() => ({x: 0, y: 0}))
  // Fit the surface between grid vertices because endpoint tangents cannot encode mixed curvature.
  const residuals = new Set(influences.flatMap((entries) => entries.map((entry) => entry.residual)))
  if (
    Array.from(residuals).every(
      (residual) => Math.hypot(residual.x, residual.y) <= Math.max(GRID_LINE_EPSILON, maximumError),
    )
  ) {
    return undefined
  }
  let bestOffsets = offsets.map((offset) => ({...offset}))
  let bestError = Array.from(residuals).reduce(
    (maximum, residual) => Math.max(maximum, Math.hypot(residual.x, residual.y)),
    0,
  )
  const system = createFitSystem(influences)
  const fittingRounds = 12
  for (let round = 0; round < fittingRounds; round += 1) {
    fitHandleOffsets(system, offsets)

    const maximumResidual = Array.from(residuals).reduce(
      (maximum, residual) => Math.max(maximum, Math.hypot(residual.x, residual.y)),
      0,
    )
    if (maximumResidual < bestError) {
      bestError = maximumResidual
      bestOffsets = offsets.map((offset) => ({...offset}))
    }
    if (maximumResidual > GRID_LINE_EPSILON) {
      for (const residual of residuals) {
        residual.importance =
          ((residual.importance ?? 1) * Math.hypot(residual.x, residual.y)) / maximumResidual
      }
    }
  }

  return bestOffsets
}

interface SurfaceProgress {
  readonly horizontalProgress: number
  readonly verticalProgress: number
}

const createSurfaceSampler = (node: PuppetSceneDeformerNode) => {
  const handles = new Map(node.curveHandles?.map((handle) => [handle.pointIndex, handle]))
  const cells = new Map<number, PuppetSceneDeformerNode>()
  return (progress: SurfaceProgress) => {
    const horizontalPosition = progress.horizontalProgress * node.columns
    const verticalPosition = progress.verticalProgress * node.rows
    const column = Math.min(node.columns - 1, Math.floor(horizontalPosition))
    const row = Math.min(node.rows - 1, Math.floor(verticalPosition))
    const cellIndex = row * node.columns + column
    let cell = cells.get(cellIndex)
    if (cell === undefined) {
      const topLeft = row * (node.columns + 1) + column
      const bottomLeft = topLeft + node.columns + 1
      const indices = [topLeft, topLeft + 1, bottomLeft, bottomLeft + 1]
      cell = {
        ...node,
        columns: 1,
        controlPoints: indices.flatMap((index) =>
          node.controlPoints.slice(index * 2, index * 2 + 2),
        ),
        curveHandles: indices.flatMap((index, pointIndex) => {
          const handle = handles.get(index)
          return handle === undefined ? [] : [{...handle, pointIndex}]
        }),
        rows: 1,
      }
      cells.set(cellIndex, cell)
    }
    return sampleDeformerSurface({
      horizontalProgress: horizontalPosition - column,
      node: cell,
      verticalProgress: verticalPosition - row,
    }).point
  }
}

const fitSurfaceHandles = (
  options: ResampleGridCurveHandlesOptions,
  handles: ReadonlyArray<PuppetDeformerCurveHandle>,
): ReadonlyArray<PuppetDeformerCurveHandle> => {
  const source = createSurfaceNode(options)
  const target = {
    ...source,
    columns: options.nextColumns,
    controlPoints: resampleGridControlPoints(options),
    curveHandles: handles,
    rows: options.nextRows,
  }
  const samplers = {source: createSurfaceSampler(source), target: createSurfaceSampler(target)}
  const indices = new Map(handles.map((handle, index) => [handle.pointIndex, index]))
  const influences = Array.from({length: handles.length * 2}, () => [] as HandleInfluence[])

  for (let row = 0; row < target.rows; row += 1) {
    for (let column = 0; column < target.columns; column += 1) {
      for (const vertical of SURFACE_SAMPLE_PROGRESS) {
        for (const horizontal of SURFACE_SAMPLE_PROGRESS) {
          const progress = {
            horizontalProgress: (column + horizontal) / target.columns,
            verticalProgress: (row + vertical) / target.rows,
          }
          const before = samplers.source(progress)
          const after = samplers.target(progress)
          const residual = {x: before.x - after.x, y: before.y - after.y}
          const topLeft = row * (target.columns + 1) + column
          const bottomLeft = topLeft + target.columns + 1
          const basis = getSurfaceWeights({
            bottomHasHandle: indices.has(bottomLeft) || indices.has(bottomLeft + 1),
            horizontalProgress: horizontal,
            topHasHandle: indices.has(topLeft) || indices.has(topLeft + 1),
            verticalProgress: vertical,
          })
          const weights: HandleWeights[] = [
            {
              horizontalWeight: basis.horizontal.point.startTangent * basis.vertical.point.start,
              pointIndex: topLeft,
              verticalWeight: (1 - horizontal) * basis.vertical.point.startTangent,
            },
            {
              horizontalWeight: basis.horizontal.point.endTangent * basis.vertical.point.start,
              pointIndex: topLeft + 1,
              verticalWeight: horizontal * basis.vertical.point.startTangent,
            },
            {
              horizontalWeight: basis.horizontal.point.startTangent * basis.vertical.point.end,
              pointIndex: bottomLeft,
              verticalWeight: (1 - horizontal) * basis.vertical.point.endTangent,
            },
            {
              horizontalWeight: basis.horizontal.point.endTangent * basis.vertical.point.end,
              pointIndex: bottomLeft + 1,
              verticalWeight: horizontal * basis.vertical.point.endTangent,
            },
          ]
          addHandleInfluences(influences, residual, weights, indices)
        }
      }
    }
  }

  const aligned =
    options.nextColumns % options.columns === 0 && options.nextRows % options.rows === 0
  const maximumError = aligned ? (options.maximumError ?? 0) / SURFACE_ERROR_BOUND_MULTIPLIER : 0
  const bestOffsets = getHandleOffsets(influences, maximumError)
  if (bestOffsets === undefined) {
    return handles
  }

  return handles.map((handle, index) => ({
    ...handle,
    horizontal: {
      x: handle.horizontal.x + bestOffsets[index * 2].x,
      y: handle.horizontal.y + bestOffsets[index * 2].y,
    },
    vertical: {
      x: handle.vertical.x + bestOffsets[index * 2 + 1].x,
      y: handle.vertical.y + bestOffsets[index * 2 + 1].y,
    },
  }))
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

  return fitSurfaceHandles(options, handles)
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
    maximumError:
      Math.max(options.node.bounds.width, options.node.bounds.height) *
      SURFACE_RESAMPLE_ERROR_RATIO,
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
