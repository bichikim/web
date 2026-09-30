import type {PuppetSpatialMesh, PuppetSpatialMeshObject} from '../player'

const COORDINATES = 3
const MIN_SIZE = 0.01

/** Converts imported world vertices into a reusable, editable local mesh. */
export const createSpatialMeshObject = (mesh: PuppetSpatialMesh): PuppetSpatialMeshObject => {
  const minimum = [Infinity, Infinity, Infinity]
  const maximum = [-Infinity, -Infinity, -Infinity]
  mesh.vertices.forEach((value, index) => {
    const axis = index % COORDINATES
    minimum[axis] = Math.min(minimum[axis]!, value)
    maximum[axis] = Math.max(maximum[axis]!, value)
  })
  const center = minimum.map((value, axis) => (value + maximum[axis]!) / 2) as [
    number,
    number,
    number,
  ]
  const size = minimum.map((value, axis) => Math.max(maximum[axis]! - value, MIN_SIZE)) as [
    number,
    number,
    number,
  ]
  return {
    center,
    id: crypto.randomUUID(),
    indices: mesh.indices,
    kind: 'mesh',
    mode: 'add',
    name: mesh.source.kind === 'imported' ? mesh.source.name : '가져온 메시',
    rotation: [0, 0, 0],
    size,
    vertices: mesh.vertices.map(
      (value, index) => (value - center[index % COORDINATES]!) / size[index % COORDINATES]!,
    ),
    visible: true,
  }
}
