import type {PuppetDeformerCurveHandle, PuppetPoint, PuppetSceneDeformerNode} from '../../player'

const COORDINATES_PER_POINT = 2
const DEGREES_PER_HALF_ROTATION = 180

export const getDeformerPoint = (
  deformer: PuppetSceneDeformerNode,
  pointIndex: number,
): PuppetPoint => ({
  x: deformer.controlPoints[pointIndex * COORDINATES_PER_POINT] ?? 0,
  y: deformer.controlPoints[pointIndex * COORDINATES_PER_POINT + 1] ?? 0,
})

interface ReflectCurveHandlePointOptions {
  readonly axis: 'horizontal' | 'vertical'
  readonly deformer: PuppetSceneDeformerNode
  readonly point: PuppetPoint
  readonly pointIndex: number
}

export const reflectCurveHandlePoint = (options: ReflectCurveHandlePointOptions): PuppetPoint => {
  const column = options.pointIndex % (options.deformer.columns + 1)
  const row = Math.floor(options.pointIndex / (options.deformer.columns + 1))
  const pastCenter =
    options.axis === 'horizontal'
      ? column > options.deformer.columns / 2
      : row > options.deformer.rows / 2

  if (!pastCenter) {
    return options.point
  }

  const origin = getDeformerPoint(options.deformer, options.pointIndex)
  return {x: origin.x * 2 - options.point.x, y: origin.y * 2 - options.point.y}
}

export const getDeformerRotationOrigin = (deformer: PuppetSceneDeformerNode): PuppetPoint => {
  if (deformer.rotationOrigin !== undefined) {
    return deformer.rotationOrigin
  }

  const pointCount = deformer.controlPoints.length / COORDINATES_PER_POINT
  const total = deformer.controlPoints.reduce(
    (result, coordinate, index) =>
      index % COORDINATES_PER_POINT === 0
        ? {...result, x: result.x + coordinate}
        : {...result, y: result.y + coordinate},
    {x: 0, y: 0},
  )

  return {x: total.x / pointCount, y: total.y / pointCount}
}

export const getDeformerAngle = (deformer: PuppetSceneDeformerNode) => {
  const left = getDeformerPoint(deformer, 0)
  const right = getDeformerPoint(deformer, deformer.columns)
  return (Math.atan2(right.y - left.y, right.x - left.x) * DEGREES_PER_HALF_ROTATION) / Math.PI
}

export interface TranslateDeformerControlPointsOptions {
  readonly controlPoints: ReadonlyArray<number>
  readonly offset: PuppetPoint
}

export const translateDeformerControlPoints = (options: TranslateDeformerControlPointsOptions) =>
  options.controlPoints.map((coordinate, index) =>
    index % COORDINATES_PER_POINT === 0
      ? coordinate + options.offset.x
      : coordinate + options.offset.y,
  )

export interface RotateDeformerControlPointsOptions {
  readonly controlPoints: ReadonlyArray<number>
  readonly degrees: number
  readonly origin: PuppetPoint
}

export const rotateDeformerControlPoints = (options: RotateDeformerControlPointsOptions) => {
  const radians = (options.degrees * Math.PI) / DEGREES_PER_HALF_ROTATION
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const controlPoints: number[] = []

  for (let index = 0; index < options.controlPoints.length; index += COORDINATES_PER_POINT) {
    const horizontalDistance = (options.controlPoints[index] ?? 0) - options.origin.x
    const verticalDistance = (options.controlPoints[index + 1] ?? 0) - options.origin.y
    controlPoints.push(
      options.origin.x + horizontalDistance * cosine - verticalDistance * sine,
      options.origin.y + horizontalDistance * sine + verticalDistance * cosine,
    )
  }

  return controlPoints
}

const translatePoint = (point: PuppetPoint, offset: PuppetPoint): PuppetPoint => ({
  x: point.x + offset.x,
  y: point.y + offset.y,
})

const rotatePoint = (point: PuppetPoint, degrees: number, origin: PuppetPoint): PuppetPoint => {
  const radians = (degrees * Math.PI) / DEGREES_PER_HALF_ROTATION
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const horizontalDistance = point.x - origin.x
  const verticalDistance = point.y - origin.y
  return {
    x: origin.x + horizontalDistance * cosine - verticalDistance * sine,
    y: origin.y + horizontalDistance * sine + verticalDistance * cosine,
  }
}

export interface TranslateDeformerCurveHandlesOptions {
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly offset: PuppetPoint
}

export const translateDeformerCurveHandles = (options: TranslateDeformerCurveHandlesOptions) =>
  options.curveHandles?.map((handle) => ({
    ...handle,
    horizontal: translatePoint(handle.horizontal, options.offset),
    vertical: translatePoint(handle.vertical, options.offset),
  }))

export interface RotateDeformerCurveHandlesOptions {
  readonly curveHandles?: ReadonlyArray<PuppetDeformerCurveHandle>
  readonly degrees: number
  readonly origin: PuppetPoint
}

export const rotateDeformerCurveHandles = (options: RotateDeformerCurveHandlesOptions) =>
  options.curveHandles?.map((handle) => ({
    ...handle,
    horizontal: rotatePoint(handle.horizontal, options.degrees, options.origin),
    vertical: rotatePoint(handle.vertical, options.degrees, options.origin),
  }))
