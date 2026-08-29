import type {PuppetMesh} from '../player/document'
import {withBoundaryLoops} from './boundary'

export const normalizeMesh = (mesh: PuppetMesh): PuppetMesh => {
  const normalized = withBoundaryLoops(mesh)

  return {
    boundaryLoops: normalized.boundaryLoops,
    indices: normalized.indices,
    uvs: normalized.uvs,
    vertices: normalized.vertices,
  }
}
