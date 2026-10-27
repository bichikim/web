import type {
  PuppetBoneWeights,
  PuppetDeformerShape,
  PuppetPoint,
  PuppetVertexReference,
} from '../player/document'

const EPSILON = 0.000001
const COORDINATES = 2
const UNIT_WEIGHT = [1] as const
const RIGID_COORDINATE_MARGIN = 8
const MAXIMUM_RIGID_COORDINATE = Math.sqrt(Number.MAX_VALUE) / RIGID_COORDINATE_MARGIN

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

const manualWeightIndexes = new WeakMap<
  ReadonlyArray<PuppetBoneWeights>,
  ReadonlyMap<string, ReadonlyMap<number, ReadonlyArray<number>>>
>()

const getManualWeights = (
  entries: ReadonlyArray<PuppetBoneWeights>,
  vertex: PuppetVertexReference,
) => {
  let indexed = manualWeightIndexes.get(entries)
  if (indexed === undefined) {
    const parts = new Map<string, Map<number, ReadonlyArray<number>>>()
    for (const entry of entries) {
      const weights = parts.get(entry.partId) ?? new Map<number, ReadonlyArray<number>>()
      if (!weights.has(entry.vertexIndex)) {
        weights.set(entry.vertexIndex, entry.weights)
      }
      parts.set(entry.partId, weights)
    }
    indexed = parts
    manualWeightIndexes.set(entries, indexed)
  }
  return indexed.get(vertex.partId)?.get(vertex.vertexIndex)
}

export const getBoneWeights = (
  node: PuppetDeformerShape,
  point: PuppetPoint,
  vertex?: PuppetVertexReference,
): readonly number[] => {
  const manual =
    node.boneWeights === undefined || vertex === undefined
      ? undefined
      : getManualWeights(node.boneWeights, vertex)
  if (manual !== undefined) {
    return manual
  }
  const rest = node.boneRestPoints!
  // One non-degenerate segment always has normalized automatic weight 1. Keep the original
  // path for extreme coordinates, where squared distances can overflow or underflow.
  if (
    rest.length === COORDINATES * 2 &&
    rest.every((value) => Number.isFinite(value) && Math.abs(value) < MAXIMUM_RIGID_COORDINATE) &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    Math.abs(point.x) < MAXIMUM_RIGID_COORDINATE &&
    Math.abs(point.y) < MAXIMUM_RIGID_COORDINATE &&
    (rest[2]! - rest[0]!) ** 2 + (rest[3]! - rest[1]!) ** 2 > 0
  ) {
    return UNIT_WEIGHT
  }
  const weights = Array.from({length: rest.length / COORDINATES - 1}, (_, index) => {
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
    return 1 / (distance * distance + Math.max(EPSILON, length * length * EPSILON))
  })
  const total = weights.reduce((sum, value) => sum + value, 0)
  return weights.map((value) => value / total)
}

export interface BoneSegmentTransform {
  readonly start: PuppetPoint
  readonly origin: PuppetPoint
  readonly cosine: number
  readonly sine: number
}

// A posed shape is immutable. Compile its frame once, instead of once for every vertex.
const segmentTransforms = new WeakMap<PuppetDeformerShape, ReadonlyArray<BoneSegmentTransform>>()

/** Compiled segment frames for an immutable posed shape with bone rest points. */
export const getBoneSegmentTransforms = (
  node: PuppetDeformerShape,
): ReadonlyArray<BoneSegmentTransform> => {
  const cached = segmentTransforms.get(node)
  if (cached !== undefined) {
    return cached
  }
  const rest = node.boneRestPoints!
  const pose = normalizeBonePose(rest, node.controlPoints)
  const scale = node.deformerType === 'rotation' ? (node.rotationScale ?? 1) : 1
  const segments = Array.from({length: rest.length / COORDINATES - 1}, (_, index) => {
    const start = joint(rest, index)
    const end = joint(rest, index + 1)
    const horizontal = end.x - start.x
    const vertical = end.y - start.y
    const origin = joint(pose, index)
    const target = joint(pose, index + 1)
    const angle =
      Math.atan2(target.y - origin.y, target.x - origin.x) - Math.atan2(vertical, horizontal)
    return {
      cosine: Math.cos(angle) * scale,
      origin,
      sine: Math.sin(angle) * scale,
      start,
    }
  })
  segmentTransforms.set(node, segments)
  return segments
}

export const transformBonePoint = (
  node: PuppetDeformerShape,
  point: PuppetPoint,
  vertex?: PuppetVertexReference,
): PuppetPoint => {
  const segments = getBoneSegmentTransforms(node)
  const weights = getBoneWeights(node, point, vertex)
  const [reflectX, reflectY] =
    node.deformerType === 'rotation' ? (node.rotationReflection ?? [false, false]) : [false, false]
  if (segments.length === 1) {
    const {start, origin, cosine, sine} = segments[0]!
    const localX = (point.x - start.x) * (reflectX ? -1 : 1)
    const localY = (point.y - start.y) * (reflectY ? -1 : 1)
    const x = origin.x + localX * cosine - localY * sine
    const y = origin.y + localX * sine + localY * cosine
    return {x: point.x + (x - point.x) * weights[0]!, y: point.y + (y - point.y) * weights[0]!}
  }
  const influences = segments.map(({start, origin, cosine, sine}, index) => {
    const localX = (point.x - start.x) * (reflectX ? -1 : 1)
    const localY = (point.y - start.y) * (reflectY ? -1 : 1)
    return {
      weight: weights[index]!,
      x: origin.x + localX * cosine - localY * sine,
      y: origin.y + localX * sine + localY * cosine,
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
