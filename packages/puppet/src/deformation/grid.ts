import {getVertexInfluence} from './weights'
import {transformPinPoint} from './pin'
import {sameDeformerShape} from './binding'
import {transformBonePoint} from './bone'
import type {
  PuppetDeformerShape,
  PuppetPoint,
  PuppetSceneDeformerNode,
  PuppetVertexReference,
} from '../player/document'
import {transformCurvePoint} from './curve'
import {sampleDeformerSurface} from './internal/surface'

const bindingMatches = new WeakMap<PuppetSceneDeformerNode, boolean>()

const GRID_INVERSE_EPSILON_RATIO = 0.0001
const GRID_INVERSE_ITERATIONS = 8
const MINIMUM_DETERMINANT = 0.000_000_1

const transformUnweightedShape = (
  node: PuppetDeformerShape,
  point: PuppetPoint,
  vertex?: PuppetVertexReference,
): PuppetPoint => {
  if (node.pins !== undefined) {
    return transformPinPoint(node, point)
  }
  if (node.boneRestPoints !== undefined) {
    return transformBonePoint(node, point, vertex)
  }
  if (node.curveAxis !== undefined) {
    return transformCurvePoint(node, point)
  }
  return sampleDeformerSurface({
    horizontalProgress: (point.x - node.bounds.x) / node.bounds.width,
    node,
    verticalProgress: (point.y - node.bounds.y) / node.bounds.height,
  }).point
}

export const transformDeformerShape = (
  node: PuppetDeformerShape,
  point: PuppetPoint,
  vertex?: PuppetVertexReference,
): PuppetPoint => {
  const weight = getVertexInfluence(node, vertex)
  if (weight === 0) {
    return point
  }
  const transformed = transformUnweightedShape(node, point, vertex)
  return {
    x: point.x + (transformed.x - point.x) * weight,
    y: point.y + (transformed.y - point.y) * weight,
  }
}

const transformUnweightedPoint = (
  node: PuppetSceneDeformerNode,
  point: PuppetPoint,
  vertex?: PuppetVertexReference,
): PuppetPoint => {
  const {binding} = node
  if (binding === undefined) {
    return transformUnweightedShape(node, point, vertex)
  }
  const preserved = binding.steps.reduce(
    (current, step) => applyBindingStep(step.shape, step.rest, current, vertex),
    point,
  )
  let unchanged = bindingMatches.get(node)
  if (unchanged === undefined) {
    unchanged = sameDeformerShape(node, binding.rest)
    bindingMatches.set(node, unchanged)
  }
  return unchanged ? preserved : applyBindingStep(node, binding.rest, preserved, vertex)
}

export const transformDeformerPoint = (
  node: PuppetSceneDeformerNode,
  point: PuppetPoint,
  vertex?: PuppetVertexReference,
): PuppetPoint => {
  const weight = getVertexInfluence(node, vertex)
  if (weight === 0) {
    return point
  }
  const transformed = transformUnweightedPoint(node, point, vertex)
  return {
    x: point.x + (transformed.x - point.x) * weight,
    y: point.y + (transformed.y - point.y) * weight,
  }
}

/** Returns the input coordinates of the current control layout after preserved binding steps. */
export const getDeformerInputPoint = (
  node: PuppetSceneDeformerNode,
  point: PuppetPoint,
  vertex?: PuppetVertexReference,
): PuppetPoint => {
  const {binding} = node
  if (binding === undefined) {
    return point
  }
  const preserved = binding.steps.reduce(
    (current, step) => applyBindingStep(step.shape, step.rest, current, vertex),
    point,
  )
  return invertPoint(binding.rest, preserved, (position) =>
    transformUnweightedShape(binding.rest, position, vertex),
  )
}

const applyBindingStep = (
  shape: PuppetDeformerShape,
  rest: PuppetDeformerShape | undefined,
  point: PuppetPoint,
  vertex?: PuppetVertexReference,
): PuppetPoint => {
  if (rest === undefined) {
    return transformUnweightedShape(shape, point, vertex)
  }
  const local = invertPoint(rest, point, (position) =>
    transformUnweightedShape(rest, position, vertex),
  )
  const reference = transformUnweightedShape(rest, local, vertex)
  const posed = transformUnweightedShape(shape, local, vertex)
  // Preserve the point's residual when the inverse is approximate or the layout is degenerate.
  return {x: point.x + posed.x - reference.x, y: point.y + posed.y - reference.y}
}

export const untransformDeformerPoint = (
  node: PuppetSceneDeformerNode,
  target: PuppetPoint,
  vertex?: PuppetVertexReference,
): PuppetPoint =>
  invertPoint(node, target, (position) => transformDeformerPoint(node, position, vertex))

const invertPoint = (
  node: PuppetDeformerShape,
  target: PuppetPoint,
  transform: (point: PuppetPoint) => PuppetPoint,
): PuppetPoint => {
  const CONVERGENCE_RATIO = 0.001
  const epsilon = Math.max(node.bounds.width, node.bounds.height) * GRID_INVERSE_EPSILON_RATIO
  let estimate = {...target}

  for (let iteration = 0; iteration < GRID_INVERSE_ITERATIONS; iteration += 1) {
    const mapped = transform(estimate)
    if (Math.hypot(mapped.x - target.x, mapped.y - target.y) < epsilon * CONVERGENCE_RATIO) {
      return estimate
    }
    const horizontalSample = transform({...estimate, x: estimate.x + epsilon})
    const verticalSample = transform({...estimate, y: estimate.y + epsilon})
    const horizontalX = (horizontalSample.x - mapped.x) / epsilon
    const horizontalY = (horizontalSample.y - mapped.y) / epsilon
    const verticalX = (verticalSample.x - mapped.x) / epsilon
    const verticalY = (verticalSample.y - mapped.y) / epsilon
    const determinant = horizontalX * verticalY - verticalX * horizontalY

    if (Math.abs(determinant) > MINIMUM_DETERMINANT) {
      const errorX = mapped.x - target.x
      const errorY = mapped.y - target.y
      estimate = {
        x: estimate.x - (verticalY * errorX - verticalX * errorY) / determinant,
        y: estimate.y - (-horizontalY * errorX + horizontalX * errorY) / determinant,
      }
    }
  }

  return estimate
}
