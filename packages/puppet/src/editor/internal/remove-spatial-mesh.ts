import {getDocumentScene, type PuppetDocument} from '../../player'
import {isSceneNodeLocked} from './scene-graph'
import {findNode, updateNode} from './scene-tree'

export interface RemoveSpatialMeshOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
}

const SPATIAL_COORDINATES = 3
const DEPTH_INDEX = 2

/** Removes a control mesh and resets the depth of parts bound to its deformer. */
export const removeSpatialMesh = (
  options: RemoveSpatialMeshOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)
  if (
    node?.kind !== 'deformer' ||
    node.deformerType !== 'spatial' ||
    node.spatialMesh === undefined ||
    isSceneNodeLocked(options.document, node.id)
  ) {
    return undefined
  }

  return {
    ...options.document,
    parts: options.document.parts.map((part) => {
      const {spatial} = part
      if (spatial?.groupId !== node.id) {
        return part
      }
      return {
        ...part,
        spatial: {
          ...spatial,
          attachments: undefined,
          controlPoints: spatial.controlPoints.map((value, index) =>
            index % SPATIAL_COORDINATES === DEPTH_INDEX ? 0 : value,
          ),
        },
      }
    }),
    scene: {
      ...scene,
      roots: updateNode(scene.roots, node.id, (candidate) =>
        candidate.kind === 'deformer'
          ? {...candidate, spatialMesh: undefined, spatialMeshPosition: undefined}
          : candidate,
      ),
    },
  }
}
