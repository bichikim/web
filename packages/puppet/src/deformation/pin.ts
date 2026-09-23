import type {PuppetDeformerShape, PuppetPoint} from '../player/document'

/** Applies finite-radius pin offsets with smooth falloff and normalized overlapping influences. */
export const transformPinPoint = (node: PuppetDeformerShape, point: PuppetPoint): PuppetPoint => {
  let horizontal = 0
  let vertical = 0
  let total = 0
  for (const [index, pin] of (node.pins ?? []).entries()) {
    const progress = Math.max(0, 1 - Math.hypot(point.x - pin.x, point.y - pin.y) / pin.radius)
    const SMOOTHSTEP_FACTOR = 3
    const weight = progress * progress * (SMOOTHSTEP_FACTOR - 2 * progress) * pin.strength
    horizontal += (node.controlPoints[index * 2]! - pin.x) * weight
    vertical += (node.controlPoints[index * 2 + 1]! - pin.y) * weight
    total += weight
  }
  const divisor = Math.max(1, total)
  return {x: point.x + horizontal / divisor, y: point.y + vertical / divisor}
}
