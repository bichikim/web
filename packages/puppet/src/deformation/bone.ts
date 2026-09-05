import type {PuppetDeformerShape, PuppetPoint} from '../player/document'

const EPSILON = 0.000001
const COORDINATES = 2

const joint = (points: readonly number[], index: number): PuppetPoint => ({
  x: points[index * COORDINATES]!,
  y: points[index * COORDINATES + 1]!,
})

export const normalizeBonePose = (rest: readonly number[], pose: readonly number[]): number[] => {
  const result = pose.slice(0, COORDINATES)
  for (let index = 1; index < rest.length / COORDINATES; index += 1) {
    const origin = joint(rest, index - 1)
    const end = joint(rest, index)
    const previous = joint(pose, index - 1)
    const target = joint(pose, index)
    let horizontal = target.x - previous.x
    let vertical = target.y - previous.y
    if (Math.hypot(horizontal, vertical) < EPSILON) {
      horizontal = end.x - origin.x
      vertical = end.y - origin.y
    }
    const scale =
      Math.hypot(end.x - origin.x, end.y - origin.y) /
      Math.max(EPSILON, Math.hypot(horizontal, vertical))
    const parent = joint(result, index - 1)
    result.push(parent.x + horizontal * scale, parent.y + vertical * scale)
  }
  return result
}

export interface MoveBoneJointOptions {
  readonly node: PuppetDeformerShape
  readonly index: number
  readonly point: PuppetPoint
}

export const moveBoneJoint = (options: MoveBoneJointOptions): number[] => {
  const points = options.node.controlPoints
  const selected = joint(points, options.index)
  if (options.index === 0) {
    return points.map(
      (value, index) =>
        value +
        (index % COORDINATES === 0 ? options.point.x - selected.x : options.point.y - selected.y),
    )
  }
  const pivot = joint(points, options.index - 1)
  if (Math.hypot(options.point.x - pivot.x, options.point.y - pivot.y) < EPSILON) {
    return [...points]
  }
  const angle =
    Math.atan2(options.point.y - pivot.y, options.point.x - pivot.x) -
    Math.atan2(selected.y - pivot.y, selected.x - pivot.x)
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return points.map((value, offset) => {
    const index = Math.floor(offset / COORDINATES)
    if (index < options.index) {
      return value
    }
    const point = joint(points, index)
    const horizontal = point.x - pivot.x
    const vertical = point.y - pivot.y
    return offset % COORDINATES === 0
      ? pivot.x + horizontal * cosine - vertical * sine
      : pivot.y + horizontal * sine + vertical * cosine
  })
}

export const transformBonePoint = (node: PuppetDeformerShape, point: PuppetPoint): PuppetPoint => {
  const rest = node.boneRestPoints!
  const pose = normalizeBonePose(rest, node.controlPoints)
  const influences = Array.from({length: rest.length / COORDINATES - 1}, (_, index) => {
    const start = joint(rest, index)
    const end = joint(rest, index + 1)
    const horizontal = end.x - start.x
    const vertical = end.y - start.y
    const length = Math.hypot(horizontal, vertical)
    const progress = Math.max(
      0,
      Math.min(
        1,
        ((point.x - start.x) * horizontal + (point.y - start.y) * vertical) / (length * length),
      ),
    )
    const distance = Math.hypot(
      point.x - start.x - progress * horizontal,
      point.y - start.y - progress * vertical,
    )
    const origin = joint(pose, index)
    const target = joint(pose, index + 1)
    const angle =
      Math.atan2(target.y - origin.y, target.x - origin.x) - Math.atan2(vertical, horizontal)
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)
    return {
      weight: 1 / (distance * distance + Math.max(EPSILON, length * length * EPSILON)),
      x: origin.x + (point.x - start.x) * cosine - (point.y - start.y) * sine,
      y: origin.y + (point.x - start.x) * sine + (point.y - start.y) * cosine,
    }
  })
  const weight = influences.reduce((sum, influence) => sum + influence.weight, 0)
  return influences.reduce(
    (result, influence) => ({
      x: result.x + (influence.x * influence.weight) / weight,
      y: result.y + (influence.y * influence.weight) / weight,
    }),
    {x: 0, y: 0},
  )
}

const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle))

export const getBoneChannels = (rest: readonly number[], pose: readonly number[]): number[] => {
  const channels = pose.slice(0, COORDINATES)
  let parent = 0
  for (let index = 1; index < rest.length / COORDINATES; index += 1) {
    const start = joint(rest, index - 1)
    const end = joint(rest, index)
    const origin = joint(pose, index - 1)
    const target = joint(pose, index)
    const angle =
      Math.atan2(target.y - origin.y, target.x - origin.x) -
      Math.atan2(end.y - start.y, end.x - start.x)
    channels.push(wrapAngle(angle - parent))
    parent = angle
  }
  return channels
}

export const poseBoneChannels = (
  rest: readonly number[],
  channels: readonly number[],
): number[] => {
  const points = channels.slice(0, COORDINATES)
  let parent = 0
  for (let index = 1; index < rest.length / COORDINATES; index += 1) {
    const start = joint(rest, index - 1)
    const end = joint(rest, index)
    parent += channels[index + 1]!
    const angle = parent + Math.atan2(end.y - start.y, end.x - start.x)
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    const origin = joint(points, index - 1)
    points.push(origin.x + Math.cos(angle) * length, origin.y + Math.sin(angle) * length)
  }
  return points
}
