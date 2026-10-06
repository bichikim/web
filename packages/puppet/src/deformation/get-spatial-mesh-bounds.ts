import type {PuppetSpatialObject, PuppetSpatialPrimitive} from '../player'
import {transformSpatialMeshObject} from './transform-spatial-mesh-object'

type Point3 = readonly [number, number, number]

const COORDINATES = 3
const HALF = 0.5
const PADDING_RATIO = 0.1

/** Bounds the visible source solids before spatial surface extraction. */
export const getSpatialMeshBounds = (
  operations: ReadonlyArray<PuppetSpatialPrimitive>,
  objects?: ReadonlyArray<PuppetSpatialObject>,
): {minimum: Point3; maximum: Point3} => {
  const minimum: [number, number, number] = [Infinity, Infinity, Infinity]
  const maximum: [number, number, number] = [-Infinity, -Infinity, -Infinity]
  const includeVertex = (value: number, axis: number) => {
    minimum[axis] = Math.min(minimum[axis]!, value)
    maximum[axis] = Math.max(maximum[axis]!, value)
  }
  const includePrimitive = (
    primitive: PuppetSpatialPrimitive | Extract<PuppetSpatialObject, {kind: 'primitive'}>,
  ) => {
    const rotated = 'rotation' in primitive && primitive.rotation.some((angle) => angle !== 0)
    for (const axis of [0, 1, 2] as const) {
      const radius = rotated ? Math.hypot(...primitive.size) * HALF : primitive.size[axis] * HALF
      includeVertex(primitive.center[axis] - radius, axis)
      includeVertex(primitive.center[axis] + radius, axis)
    }
  }
  const includeObject = (object: PuppetSpatialObject): void => {
    if (!object.visible) {
      return
    }
    switch (object.kind) {
      case 'primitive':
        includePrimitive(object)
        return
      case 'mesh':
        transformSpatialMeshObject(object).vertices.forEach((value, index) =>
          includeVertex(value, index % COORDINATES),
        )
        return
      case 'group':
        object.children.forEach(includeObject)
    }
  }
  if (objects === undefined) {
    const solids = operations.filter(
      (primitive) => primitive.mode === 'add' || primitive.mode === 'smooth-add',
    )
    ;(solids.length > 0 ? solids : operations).forEach(includePrimitive)
  } else {
    objects.forEach(includeObject)
  }
  const padding = Math.max(...maximum.map((value, axis) => value - minimum[axis]!)) * PADDING_RATIO
  return {
    maximum: [maximum[0] + padding, maximum[1] + padding, maximum[2] + padding],
    minimum: [minimum[0] - padding, minimum[1] - padding, minimum[2] - padding],
  }
}
