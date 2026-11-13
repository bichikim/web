import {getBoneSegmentTransforms} from '../../../../deformation/bone'
import {transformDeformerPoint} from '../../../../deformation/grid'
import type {PuppetSceneDeformerNode} from '../../../document'
import type {NativeTransform} from '../../create-native-deformation'

/** Preserves host trigonometry and native rotation inheritance before batch mapping. */
export const getRotationFrame = (
  node: PuppetSceneDeformerNode,
  parent: NativeTransform | undefined,
): number[] => {
  const origin = transformDeformerPoint(node, {x: 0, y: 0})
  const world = parent?.sample(origin) ?? origin
  const worldX = world.x
  const worldY = world.y
  const REFERENCE_DISTANCE = 0.1
  const distance = node.rotationReferenceDistance ?? REFERENCE_DISTANCE
  const referencePoint = {x: origin.x, y: origin.y - distance}
  const reference = parent?.sample(referencePoint) ?? referencePoint
  const angle =
    Math.atan2(
      (worldY - reference.y) * Math.sign(distance),
      (worldX - reference.x) * Math.sign(distance),
    ) -
    Math.PI / 2
  const scale =
    parent?.rotation === true
      ? Math.hypot(worldX - reference.x, worldY - reference.y) / Math.abs(distance)
      : 1
  const segment = getBoneSegmentTransforms(node)[0]!
  return [
    origin.x,
    origin.y,
    worldX,
    worldY,
    Math.cos(angle) * scale,
    Math.sin(angle) * scale,
    segment.start.x,
    segment.start.y,
    segment.origin.x,
    segment.origin.y,
    segment.cosine,
    segment.sine,
    node.rotationReflection?.[0] === true ? -1 : 1,
    node.rotationReflection?.[1] === true ? -1 : 1,
  ]
}
