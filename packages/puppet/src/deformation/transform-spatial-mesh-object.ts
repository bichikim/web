import type {PuppetSpatialMeshObject} from '../player'
import {rotateSpatialPoint} from './rotate-spatial-point'

const COORDINATES = 3

/** Applies an editable imported mesh's size, rotation, and center to its local vertices. */
export const transformSpatialMeshObject = (object: PuppetSpatialMeshObject) => ({
  indices: object.indices,
  vertices: Array.from({length: object.vertices.length / COORDINATES}, (_, index) => {
    const offset = index * COORDINATES
    const local: [number, number, number] = [
      object.vertices[offset]! * object.size[0],
      object.vertices[offset + 1]! * object.size[1],
      object.vertices[offset + 2]! * object.size[2],
    ]
    return rotateSpatialPoint(local, object.rotation).map(
      (value, axis) => value + object.center[axis]!,
    )
  }).flat(),
})
