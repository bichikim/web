import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetPart,
  type PuppetSpatialMesh,
} from '../../player'
import {bindSpatialPartToMesh} from '../../deformation/bind-spatial-mesh'
import {isSceneNodeLocked} from './scene-graph'
import {findNode, updateNode} from './scene-tree'

export interface SetSpatialMeshOptions {
  readonly document: PuppetDocument
  readonly mesh: PuppetSpatialMesh
  readonly nodeId: string
}

/** Assigns a control mesh and binds the current image vertices to its front surface. */
export const setSpatialMesh = (options: SetSpatialMeshOptions): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)
  if (
    node?.kind !== 'deformer' ||
    node.deformerType !== 'spatial' ||
    isSceneNodeLocked(options.document, node.id)
  ) {
    return undefined
  }
  const parts = options.document.parts.map((part) => {
    if (part.spatial?.groupId !== node.id) {
      return part
    }
    return bindSpatialPartToMesh(part, options.mesh, node.spatialMeshPosition)
  })
  if (parts.some((part) => part === undefined)) {
    return undefined
  }
  return {
    ...options.document,
    parts: parts.filter((part): part is PuppetPart => part !== undefined),
    scene: {
      ...scene,
      roots: updateNode(scene.roots, node.id, (candidate) =>
        candidate.kind === 'deformer' ? {...candidate, spatialMesh: options.mesh} : candidate,
      ),
    },
  }
}
