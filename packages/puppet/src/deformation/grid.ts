import {transformPinPoint} from './pin'
import {sameDeformerShape} from './binding'
import {transformBonePoint} from './bone'
import type {PuppetDeformerShape, PuppetPoint, PuppetSceneDeformerNode} from '../player/document'
import {transformCurvePoint} from './curve'
import {sampleDeformerSurface} from './internal/surface'

const bindingMatches = new WeakMap<PuppetSceneDeformerNode, boolean>()

const GRID_INVERSE_EPSILON_RATIO = 0.0001
const GRID_INVERSE_ITERATIONS = 8
const MINIMUM_DETERMINANT = 0.000_000_1

export const transformDeformerShape = (
  node: PuppetDeformerShape,
  point: PuppetPoint,
): PuppetPoint => {
  if (node.pins !== undefined) {
    return transformPinPoint(node, point)
  }
  if (node.boneRestPoints !== undefined) {
    return transformBonePoint(node, point)
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

export const transformDeformerPoint = (
  node: PuppetSceneDeformerNode,
  point: PuppetPoint,
): PuppetPoint => {
  const {binding} = node
  if (binding === undefined) {
    return transformDeformerShape(node, point)
  }
  const preserved = binding.steps.reduce(
    (current, step) => applyBindingStep(step.shape, step.rest, current),
    point,
  )
  let unchanged = bindingMatches.get(node)
  if (unchanged === undefined) {
    unchanged = sameDeformerShape(node, binding.rest)
    bindingMatches.set(node, unchanged)
  }
  return unchanged ? preserved : applyBindingStep(node, binding.rest, preserved)
}

const applyBindingStep = (
  shape: PuppetDeformerShape,
  rest: PuppetDeformerShape | undefined,
  point: PuppetPoint,
): PuppetPoint => {
  if (rest === undefined) {
    return transformDeformerShape(shape, point)
  }
  const local = invertPoint(rest, point, (position) => transformDeformerShape(rest, position))
  const reference = transformDeformerShape(rest, local)
  const posed = transformDeformerShape(shape, local)
  // Preserve the point's residual when the inverse is approximate or the layout is degenerate.
  return {x: point.x + posed.x - reference.x, y: point.y + posed.y - reference.y}
}

export const untransformDeformerPoint = (
  node: PuppetSceneDeformerNode,
  target: PuppetPoint,
): PuppetPoint => invertPoint(node, target, (position) => transformDeformerPoint(node, position))

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
