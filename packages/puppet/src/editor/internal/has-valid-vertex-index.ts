import type {PuppetMesh} from '../../player/document'

const COORDINATES_PER_VERTEX = 2

export const hasValidVertexIndex = (mesh: PuppetMesh, vertexIndex: number): boolean =>
  Number.isInteger(vertexIndex) &&
  vertexIndex >= 0 &&
  vertexIndex < mesh.vertices.length / COORDINATES_PER_VERTEX
