import type {PuppetDeformerShape, PuppetPoint} from '../../player/document'

const BEZIER_TANGENT_MULTIPLIER = 3
const COORDINATES_PER_POINT = 2
const CUBIC_CURVE_WEIGHT = 3
const CURVE_DERIVATIVE_WEIGHT = 6
const DOUBLE_CURVE_WEIGHT = 2
const START_TANGENT_DERIVATIVE_WEIGHT = 4

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
  readonly progress: number
  readonly start: PuppetPoint
  readonly startTangent: PuppetPoint
}

const sampleCurve = (options: SampleCurveOptions): CurveSample => {
  const squared = options.progress * options.progress
  const cubed = squared * options.progress
  const startWeight = DOUBLE_CURVE_WEIGHT * cubed - CUBIC_CURVE_WEIGHT * squared + 1
  const startTangentWeight = cubed - DOUBLE_CURVE_WEIGHT * squared + options.progress
  const endWeight = -DOUBLE_CURVE_WEIGHT * cubed + CUBIC_CURVE_WEIGHT * squared
  const endTangentWeight = cubed - squared
  const startDerivativeWeight =
    CURVE_DERIVATIVE_WEIGHT * squared - CURVE_DERIVATIVE_WEIGHT * options.progress
  const startTangentDerivativeWeight =
    CUBIC_CURVE_WEIGHT * squared - START_TANGENT_DERIVATIVE_WEIGHT * options.progress + 1
  const endDerivativeWeight =
    -CURVE_DERIVATIVE_WEIGHT * squared + CURVE_DERIVATIVE_WEIGHT * options.progress
  const endTangentDerivativeWeight = CUBIC_CURVE_WEIGHT * squared - 2 * options.progress

  return {
    point: {
      x:
        options.start.x * startWeight +
        options.startTangent.x * startTangentWeight +
        options.end.x * endWeight +
        options.endTangent.x * endTangentWeight,
      y:
        options.start.y * startWeight +
        options.startTangent.y * startTangentWeight +
        options.end.y * endWeight +
        options.endTangent.y * endTangentWeight,
    },
    tangent: {
      x:
        options.start.x * startDerivativeWeight +
        options.startTangent.x * startTangentDerivativeWeight +
        options.end.x * endDerivativeWeight +
        options.endTangent.x * endTangentDerivativeWeight,
      y:
        options.start.y * startDerivativeWeight +
        options.startTangent.y * startTangentDerivativeWeight +
        options.end.y * endDerivativeWeight +
        options.endTangent.y * endTangentDerivativeWeight,
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
  const topDifference = subtractPoint(topRight, topLeft)
  const bottomDifference = subtractPoint(bottomRight, bottomLeft)
  const top = sampleCurve({
    end: topRight,
    endTangent: getAxisTangent(options.node, topRightIndex, 'horizontal', topDifference),
    progress: columnProgress,
    start: topLeft,
    startTangent: getAxisTangent(options.node, topLeftIndex, 'horizontal', topDifference),
  })
  const bottom = sampleCurve({
    end: bottomRight,
    endTangent: getAxisTangent(options.node, bottomRightIndex, 'horizontal', bottomDifference),
    progress: columnProgress,
    start: bottomLeft,
    startTangent: getAxisTangent(options.node, bottomLeftIndex, 'horizontal', bottomDifference),
  })
  const verticalDifference = subtractPoint(bottom.point, top.point)
  const topHasVerticalHandle =
    getCurveHandle(options.node, topLeftIndex) !== undefined ||
    getCurveHandle(options.node, topRightIndex) !== undefined
  const bottomHasVerticalHandle =
    getCurveHandle(options.node, bottomLeftIndex) !== undefined ||
    getCurveHandle(options.node, bottomRightIndex) !== undefined
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
  const topTangent = topHasVerticalHandle
    ? interpolatePoint(topLeftVertical, topRightVertical, columnProgress)
    : verticalDifference
  const bottomTangent = bottomHasVerticalHandle
    ? interpolatePoint(bottomLeftVertical, bottomRightVertical, columnProgress)
    : verticalDifference
  const topTangentDerivative = topHasVerticalHandle
    ? subtractPoint(topRightVertical, topLeftVertical)
    : subtractPoint(bottom.tangent, top.tangent)
  const bottomTangentDerivative = bottomHasVerticalHandle
    ? subtractPoint(bottomRightVertical, bottomLeftVertical)
    : subtractPoint(bottom.tangent, top.tangent)
  const surface = sampleCurve({
    end: bottom.point,
    endTangent: bottomTangent,
    progress: rowProgress,
    start: top.point,
    startTangent: topTangent,
  })
  const horizontal = sampleCurve({
    end: bottom.tangent,
    endTangent: bottomTangentDerivative,
    progress: rowProgress,
    start: top.tangent,
    startTangent: topTangentDerivative,
  })

  return {
    horizontalTangent: horizontal.point,
    point: surface.point,
    verticalTangent: surface.tangent,
  }
}
