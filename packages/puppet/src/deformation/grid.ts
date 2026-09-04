import type {PuppetPoint, PuppetSceneDeformerNode} from '../player/document'
import {sampleDeformerSurface} from './internal/surface'

const GRID_INVERSE_EPSILON_RATIO = 0.0001
const GRID_INVERSE_ITERATIONS = 8
const MINIMUM_DETERMINANT = 0.000_000_1

export const transformDeformerPoint = (
  node: PuppetSceneDeformerNode,
  point: PuppetPoint,
): PuppetPoint =>
  sampleDeformerSurface({
    horizontalProgress: (point.x - node.bounds.x) / node.bounds.width,
    node,
    verticalProgress: (point.y - node.bounds.y) / node.bounds.height,
  }).point

export const untransformDeformerPoint = (
  node: PuppetSceneDeformerNode,
  target: PuppetPoint,
): PuppetPoint => {
  const epsilon = Math.max(node.bounds.width, node.bounds.height) * GRID_INVERSE_EPSILON_RATIO
  let estimate = {...target}

  for (let iteration = 0; iteration < GRID_INVERSE_ITERATIONS; iteration += 1) {
    const mapped = transformDeformerPoint(node, estimate)
    const horizontalSample = transformDeformerPoint(node, {...estimate, x: estimate.x + epsilon})
    const verticalSample = transformDeformerPoint(node, {...estimate, y: estimate.y + epsilon})
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
