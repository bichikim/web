import type {PuppetDeformerShape, PuppetPoint} from '../../player/document'
import {type CurveWeights, getSurfaceWeights} from './get-surface-weights'

const BEZIER_TANGENT_MULTIPLIER = 3
const COORDINATES_PER_POINT = 2

interface CurveSample {
  readonly point: PuppetPoint
  readonly tangent: PuppetPoint
}

export interface DeformerSurfaceSample {
  readonly horizontalTangent: PuppetPoint
  readonly point: PuppetPoint
  readonly verticalTangent: PuppetPoint
}

export interface SampleDeformerSurfaceOptions {
  readonly horizontalProgress: number
  readonly node: PuppetDeformerShape
  readonly verticalProgress: number
}

const getControlPoint = (node: PuppetDeformerShape, column: number, row: number): PuppetPoint => {
  const coordinateIndex = (row * (node.columns + 1) + column) * COORDINATES_PER_POINT
  return {
    x: node.controlPoints[coordinateIndex] ?? 0,
    y: node.controlPoints[coordinateIndex + 1] ?? 0,
  }
}

const getCurveHandle = (node: PuppetDeformerShape, pointIndex: number) =>
  node.curveHandles?.find((handle) => handle.pointIndex === pointIndex)

const subtractPoint = (end: PuppetPoint, start: PuppetPoint): PuppetPoint => ({
  x: end.x - start.x,
  y: end.y - start.y,
})

const getAxisTangent = (
  node: PuppetDeformerShape,
  pointIndex: number,
  axis: 'horizontal' | 'vertical',
  fallback: PuppetPoint,
) => {
  const point = getControlPoint(
    node,
    pointIndex % (node.columns + 1),
    Math.floor(pointIndex / (node.columns + 1)),
  )
  const handle = getCurveHandle(node, pointIndex)?.[axis]
  return handle === undefined
    ? fallback
    : {
        x: (handle.x - point.x) * BEZIER_TANGENT_MULTIPLIER,
        y: (handle.y - point.y) * BEZIER_TANGENT_MULTIPLIER,
      }
}

const interpolatePoint = (first: PuppetPoint, second: PuppetPoint, progress: number) => ({
  x: first.x + (second.x - first.x) * progress,
  y: first.y + (second.y - first.y) * progress,
})

interface SampleCurveOptions {
  readonly end: PuppetPoint
  readonly endTangent: PuppetPoint
  readonly weights: CurveWeights
  readonly start: PuppetPoint
  readonly startTangent: PuppetPoint
}

const sampleCurve = (options: SampleCurveOptions): CurveSample => {
  const {point, tangent} = options.weights

  return {
    point: {
      x:
        options.start.x * point.start +
        options.startTangent.x * point.startTangent +
        options.end.x * point.end +
        options.endTangent.x * point.endTangent,
      y:
        options.start.y * point.start +
        options.startTangent.y * point.startTangent +
        options.end.y * point.end +
        options.endTangent.y * point.endTangent,
    },
    tangent: {
      x:
        options.start.x * tangent.start +
        options.startTangent.x * tangent.startTangent +
        options.end.x * tangent.end +
        options.endTangent.x * tangent.endTangent,
      y:
        options.start.y * tangent.start +
        options.startTangent.y * tangent.startTangent +
        options.end.y * tangent.end +
        options.endTangent.y * tangent.endTangent,
    },
  }
}

export const sampleDeformerSurface = (
  options: SampleDeformerSurfaceOptions,
): DeformerSurfaceSample => {
  const horizontalPosition = options.horizontalProgress * options.node.columns
  const verticalPosition = options.verticalProgress * options.node.rows
  const column = Math.min(options.node.columns - 1, Math.max(0, Math.floor(horizontalPosition)))
  const row = Math.min(options.node.rows - 1, Math.max(0, Math.floor(verticalPosition)))
  const columnProgress = horizontalPosition - column
  const rowProgress = verticalPosition - row
  const topLeft = getControlPoint(options.node, column, row)
  const topRight = getControlPoint(options.node, column + 1, row)
  const bottomLeft = getControlPoint(options.node, column, row + 1)
  const bottomRight = getControlPoint(options.node, column + 1, row + 1)
  const topLeftIndex = row * (options.node.columns + 1) + column
  const topRightIndex = topLeftIndex + 1
  const bottomLeftIndex = (row + 1) * (options.node.columns + 1) + column
  const bottomRightIndex = bottomLeftIndex + 1
  const weights = getSurfaceWeights({
    bottomHasHandle:
      getCurveHandle(options.node, bottomLeftIndex) !== undefined ||
      getCurveHandle(options.node, bottomRightIndex) !== undefined,
    horizontalProgress: columnProgress,
    topHasHandle:
      getCurveHandle(options.node, topLeftIndex) !== undefined ||
      getCurveHandle(options.node, topRightIndex) !== undefined,
    verticalProgress: rowProgress,
  })
  const topDifference = subtractPoint(topRight, topLeft)
  const bottomDifference = subtractPoint(bottomRight, bottomLeft)
  const top = sampleCurve({
    end: topRight,
    endTangent: getAxisTangent(options.node, topRightIndex, 'horizontal', topDifference),
    start: topLeft,
    startTangent: getAxisTangent(options.node, topLeftIndex, 'horizontal', topDifference),
    weights: weights.horizontal,
  })
  const bottom = sampleCurve({
    end: bottomRight,
    endTangent: getAxisTangent(options.node, bottomRightIndex, 'horizontal', bottomDifference),
    start: bottomLeft,
    startTangent: getAxisTangent(options.node, bottomLeftIndex, 'horizontal', bottomDifference),
    weights: weights.horizontal,
  })
  const topLeftVertical = getAxisTangent(
    options.node,
    topLeftIndex,
    'vertical',
    subtractPoint(bottomLeft, topLeft),
  )
  const topRightVertical = getAxisTangent(
    options.node,
    topRightIndex,
    'vertical',
    subtractPoint(bottomRight, topRight),
  )
  const bottomLeftVertical = getAxisTangent(
    options.node,
    bottomLeftIndex,
    'vertical',
    subtractPoint(bottomLeft, topLeft),
  )
  const bottomRightVertical = getAxisTangent(
    options.node,
    bottomRightIndex,
    'vertical',
    subtractPoint(bottomRight, topRight),
  )
  const topTangent = interpolatePoint(topLeftVertical, topRightVertical, columnProgress)
  const bottomTangent = interpolatePoint(bottomLeftVertical, bottomRightVertical, columnProgress)
  const topTangentDerivative = subtractPoint(topRightVertical, topLeftVertical)
  const bottomTangentDerivative = subtractPoint(bottomRightVertical, bottomLeftVertical)
  const surface = sampleCurve({
    end: bottom.point,
    endTangent: bottomTangent,
    start: top.point,
    startTangent: topTangent,
    weights: weights.vertical,
  })
  const horizontal = sampleCurve({
    end: bottom.tangent,
    endTangent: bottomTangentDerivative,
    start: top.tangent,
    startTangent: topTangentDerivative,
    weights: weights.vertical,
  })

  return {
    horizontalTangent: horizontal.point,
    point: surface.point,
    verticalTangent: surface.tangent,
  }
}
