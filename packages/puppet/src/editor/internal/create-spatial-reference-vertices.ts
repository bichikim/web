import {getSpatialMeshAttachmentSampler} from '../../deformation/bind-spatial-mesh'
import type {PuppetPart, PuppetSpatialMesh} from '../../player'

const MESH_COORDINATES = 3
const PART_COORDINATES = 2
const SURFACE_LIFT_RATIO = 0.0005

const getSurfaceLift = (mesh: PuppetSpatialMesh) => {
  const minimum = [Infinity, Infinity, Infinity]
  const maximum = [-Infinity, -Infinity, -Infinity]
  mesh.vertices.forEach((value, index) => {
    const axis = index % MESH_COORDINATES
    minimum[axis] = Math.min(minimum[axis]!, value)
    maximum[axis] = Math.max(maximum[axis]!, value)
  })
  return Math.max(1, ...maximum.map((value, axis) => value - minimum[axis]!)) * SURFACE_LIFT_RATIO
}

/** Positions a part's image vertices on the mesh front surface, or on the flat rest plane. */
export const createSpatialReferenceVertices = (
  part: PuppetPart,
  mesh?: PuppetSpatialMesh,
): Float32Array | undefined => {
  const sample = mesh === undefined ? undefined : getSpatialMeshAttachmentSampler(mesh)
  const lift = mesh === undefined ? 0 : getSurfaceLift(mesh)
  const positions = new Float32Array(
    (part.mesh.vertices.length / PART_COORDINATES) * MESH_COORDINATES,
  )
  for (let index = 0; index < part.mesh.vertices.length / PART_COORDINATES; index += 1) {
    const x = part.mesh.vertices[index * PART_COORDINATES]!
    const y = part.mesh.vertices[index * PART_COORDINATES + 1]!
    const point = sample?.(x, y)?.point
    if (mesh !== undefined && point === undefined) {
      return undefined
    }
    positions[index * MESH_COORDINATES] = x
    positions[index * MESH_COORDINATES + 1] = -y
    positions[index * MESH_COORDINATES + 2] = (point?.[2] ?? 0) + lift
  }
  return positions
}
