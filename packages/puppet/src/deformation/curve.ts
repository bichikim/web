import type {PuppetDeformerShape, PuppetPoint} from '../player/document'

const CUBIC_DEGREE = 3
const DERIVATIVE_MIDDLE_WEIGHT = 6
const TANGENT_EPSILON = 0.000001

export const transformCurvePoint = (node: PuppetDeformerShape, point: PuppetPoint): PuppetPoint => {
  const vertical = node.curveAxis === 'y'
  const length = vertical ? node.bounds.height : node.bounds.width
  const progress = vertical
    ? (point.y - node.bounds.y) / length
    : (point.x - node.bounds.x) / length
  const offset = vertical
    ? point.x - node.bounds.x - node.bounds.width / 2
    : point.y - node.bounds.y - node.bounds.height / 2
  const clamped = Math.max(0, Math.min(1, progress))
  const segmentCount = (node.controlPoints.length / 2 - 1) / CUBIC_DEGREE
  const breaks = node.curveBreaks ?? [0, 1]
  const found = breaks.findIndex((boundary) => boundary > clamped)
  const segment = found < 0 ? segmentCount - 1 : Math.max(0, found - 1)
  const time = (clamped - breaks[segment]!) / (breaks[segment + 1]! - breaks[segment]!)
  const inverse = 1 - time
  const points = Array.from({length: 4}, (_, index) => ({
    x: node.controlPoints[(segment * CUBIC_DEGREE + index) * 2]!,
    y: node.controlPoints[(segment * CUBIC_DEGREE + index) * 2 + 1]!,
  }))
  const [start, outgoing, incoming, end] = points as [
    PuppetPoint,
    PuppetPoint,
    PuppetPoint,
    PuppetPoint,
  ]
  const weights = [
    inverse ** CUBIC_DEGREE,
    CUBIC_DEGREE * inverse ** 2 * time,
    CUBIC_DEGREE * inverse * time ** 2,
    time ** CUBIC_DEGREE,
  ]
  const center = points.reduce(
    (result, item, index) => ({
      x: result.x + item.x * weights[index]!,
      y: result.y + item.y * weights[index]!,
    }),
    {x: 0, y: 0},
  )
  let tangent = {
    x:
      CUBIC_DEGREE * inverse ** 2 * (outgoing.x - start.x) +
      DERIVATIVE_MIDDLE_WEIGHT * inverse * time * (incoming.x - outgoing.x) +
      CUBIC_DEGREE * time ** 2 * (end.x - incoming.x),
    y:
      CUBIC_DEGREE * inverse ** 2 * (outgoing.y - start.y) +
      DERIVATIVE_MIDDLE_WEIGHT * inverse * time * (incoming.y - outgoing.y) +
      CUBIC_DEGREE * time ** 2 * (end.y - incoming.y),
  }
  if (Math.hypot(tangent.x, tangent.y) < TANGENT_EPSILON) {
    tangent = {x: end.x - start.x, y: end.y - start.y}
  }
  if (Math.hypot(tangent.x, tangent.y) < TANGENT_EPSILON) {
    tangent = vertical ? {x: 0, y: 1} : {x: 1, y: 0}
  }
  const magnitude = Math.hypot(tangent.x, tangent.y)
  const direction = {x: tangent.x / magnitude, y: tangent.y / magnitude}
  const extension = (progress - clamped) * length
  const normal = vertical ? {x: direction.y, y: -direction.x} : {x: -direction.y, y: direction.x}
  return {
    x: center.x + direction.x * extension + normal.x * offset,
    y: center.y + direction.y * extension + normal.y * offset,
  }
}
