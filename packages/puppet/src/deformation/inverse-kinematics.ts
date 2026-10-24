import type {PuppetPoint, PuppetSceneDeformerNode} from '../player/document'
import {normalizeBonePose} from './bone'

export interface SolveBoneIkOptions {
  readonly node: PuppetSceneDeformerNode
  readonly point: PuppetPoint
}
const EPSILON = 0.000001
const MAXIMUM_ITERATIONS = 128
const TOLERANCE_RATIO = 0.00001
const SEED_RATIO = 0.01

const distance = (left: PuppetPoint, right: PuppetPoint) =>
  Math.hypot(left.x - right.x, left.y - right.y)
const atDistance = (origin: PuppetPoint, target: PuppetPoint, length: number): PuppetPoint => {
  const magnitude = distance(origin, target)
  return magnitude < EPSILON
    ? {x: origin.x + length, y: origin.y}
    : {
        x: origin.x + ((target.x - origin.x) * length) / magnitude,
        y: origin.y + ((target.y - origin.y) * length) / magnitude,
      }
}

/** Solves a fixed-root chain toward a target while preserving bind lengths. */
export const solveBoneIk = (options: SolveBoneIkOptions): number[] => {
  const rest = options.node.boneRestPoints
  if (
    rest === undefined ||
    !Number.isFinite(options.point.x) ||
    !Number.isFinite(options.point.y)
  ) {
    return [...options.node.controlPoints]
  }
  const pose = normalizeBonePose(rest, options.node.controlPoints)
  const points = Array.from({length: pose.length / 2}, (_, index) => ({
    x: pose[index * 2]!,
    y: pose[index * 2 + 1]!,
  }))
  const root = points[0]!
  const lengths = points.slice(1).map((point, index) => distance(points[index]!, point))
  const total = lengths.reduce((sum, length) => sum + length, 0)
  const tolerance = Math.max(EPSILON, total * TOLERANCE_RATIO)
  const last = points.length - 1
  if (distance(root, options.point) >= total) {
    for (let index = 1; index <= last; index += 1) {
      points[index] = atDistance(points[index - 1]!, options.point, lengths[index - 1]!)
    }
    return points.flatMap((point) => [point.x, point.y])
  }
  const axis = atDistance(root, points[last]!, 1)
  const horizontal = axis.x - root.x
  const vertical = axis.y - root.y
  const collinear = points.every(
    (point) =>
      Math.abs((point.x - root.x) * vertical - (point.y - root.y) * horizontal) < tolerance,
  )
  if (collinear && last > 1) {
    // A straight chain needs a bend direction to reach a target inside its span.
    points[1] = {
      x: points[1]!.x - vertical * total * SEED_RATIO,
      y: points[1]!.y + horizontal * total * SEED_RATIO,
    }
  }
  for (let iteration = 0; iteration < MAXIMUM_ITERATIONS; iteration += 1) {
    points[last] = options.point
    for (let index = last - 1; index >= 0; index -= 1) {
      points[index] = atDistance(points[index + 1]!, points[index]!, lengths[index]!)
    }
    points[0] = root
    for (let index = 1; index <= last; index += 1) {
      points[index] = atDistance(points[index - 1]!, points[index]!, lengths[index - 1]!)
    }
    if (distance(points[last]!, options.point) <= tolerance) {
      return points.flatMap((point) => [point.x, point.y])
    }
  }
  return points.flatMap((point) => [point.x, point.y])
}
