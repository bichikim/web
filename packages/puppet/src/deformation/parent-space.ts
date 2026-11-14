import type {PuppetPoint, PuppetSceneDeformerNode} from '../player/document'
import {transformDeformerPoint} from './grid'
import {createDeferredPointCoordinates, getCoordinateReader} from './internal/deferred-coordinates'

const ROTATION_REFERENCE_DISTANCE = 0.1

type PointTransform = (point: PuppetPoint) => PuppetPoint

const transformPoints = (points: ReadonlyArray<number>, transform: PointTransform): number[] => {
  const coordinates = Math.floor(points.length / 2) * 2
  const result: number[] = []
  result.length = coordinates
  for (let index = 0; index < coordinates; index += 2) {
    const point = transform({x: points[index]!, y: points[index + 1]!})
    result[index] = point.x
    result[index + 1] = point.y
  }
  return result
}

const deferPoints = (
  points: ReadonlyArray<number>,
  transform: PointTransform,
): ReadonlyArray<number> => {
  const read = getCoordinateReader(points)
  return createDeferredPointCoordinates({
    pointCount: Math.floor(points.length / 2),
    sample: (index) => transform({x: read(index * 2)!, y: read(index * 2 + 1)!}),
  })
}

/** 부모 로컬 좌표의 디포머를 문서 좌표로 해석한다. */
const createTransform = (
  node: PuppetSceneDeformerNode,
  parent: PointTransform,
  parentDeformer: PuppetSceneDeformerNode | undefined,
  mapPoints: (points: ReadonlyArray<number>, transform: PointTransform) => ReadonlyArray<number>,
): PointTransform => {
  if (node.deformerType === 'rotation') {
    const origin = transformDeformerPoint(node, {x: 0, y: 0})
    const world = parent(origin)
    const distance = node.rotationReferenceDistance ?? ROTATION_REFERENCE_DISTANCE
    const reference = parent({x: origin.x, y: origin.y - distance})
    const inheritedRotation = parentDeformer?.deformerType === 'rotation'
    const angle =
      Math.atan2(
        (world.y - reference.y) * Math.sign(distance),
        (world.x - reference.x) * Math.sign(distance),
      ) -
      Math.PI / 2
    const scale = inheritedRotation
      ? Math.hypot(world.x - reference.x, world.y - reference.y) / Math.abs(distance)
      : 1
    const cosine = Math.cos(angle) * scale
    const sine = Math.sin(angle) * scale
    return (point) => {
      const local = transformDeformerPoint(node, point)
      const x = local.x - origin.x
      const y = local.y - origin.y
      return {x: world.x + x * cosine - y * sine, y: world.y + x * sine + y * cosine}
    }
  }
  const world = {
    ...node,
    controlPoints: mapPoints(node.controlPoints, parent),
    curveHandles: node.curveHandles?.map((handle) => ({
      ...handle,
      horizontal: parent(handle.horizontal),
      vertical: parent(handle.vertical),
    })),
  }
  return (point) => transformDeformerPoint(world, point)
}

/** 부모 로컬 좌표의 디포머를 문서 좌표로 해석한다. */
export const createParentSpaceTransform = (
  node: PuppetSceneDeformerNode,
  parent: PointTransform,
  parentDeformer?: PuppetSceneDeformerNode,
): PointTransform => createTransform(node, parent, parentDeformer, transformPoints)

/** Defers transformed control points until rendering reads them; the parent mapping must remain constant. */
export const createDeferredParentSpaceTransform = (
  node: PuppetSceneDeformerNode,
  parent: PointTransform,
  parentDeformer?: PuppetSceneDeformerNode,
): PointTransform => createTransform(node, parent, parentDeformer, deferPoints)
