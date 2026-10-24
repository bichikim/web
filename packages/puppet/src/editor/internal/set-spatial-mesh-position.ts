import {bindSpatialPartToMesh} from '../../deformation/bind-spatial-mesh'
import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetPart,
  type PuppetSpatialMesh,
} from '../../player'
import {isSceneNodeLocked} from './scene-graph'
import {findNode, updateNode} from './scene-tree'

export interface SetSpatialMeshPositionOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly position: readonly [number, number, number]
}

const SPATIAL_COORDINATES = 3
const PLANAR_COORDINATES = 2

const rebindPart = (
  part: PuppetPart,
  mesh: PuppetSpatialMesh,
  position: readonly [number, number, number],
): PuppetPart | undefined => {
  const rebound = bindSpatialPartToMesh(part, mesh, position)
  if (rebound?.spatial === undefined || part.spatial === undefined) {
    return undefined
  }
  const points = rebound.spatial.attachments!.map((attachment, index) => {
    const spatialIndex = index * SPATIAL_COORDINATES
    const imageIndex = index * PLANAR_COORDINATES
    const x = part.spatial!.controlPoints[spatialIndex]! - part.mesh.vertices[imageIndex]!
    const y = part.spatial!.controlPoints[spatialIndex + 1]! - part.mesh.vertices[imageIndex + 1]!
    const z = part.spatial!.attachments?.[index]?.offset[2] ?? 0
    return {
      attachment: {
        ...attachment,
        offset: [attachment.offset[0] + x, attachment.offset[1] + y, z] as const,
      },
      point: [
        rebound.spatial!.controlPoints[spatialIndex]! + x,
        rebound.spatial!.controlPoints[spatialIndex + 1]! + y,
        rebound.spatial!.controlPoints[spatialIndex + 2]! + z,
      ],
    }
  })
  return {
    ...rebound,
    spatial: {
      ...rebound.spatial,
      attachments: points.map((item) => item.attachment),
      controlPoints: points.flatMap((item) => item.point),
    },
  }
}

/** Moves the bind mesh while keeping image vertices in their rest image positions. */
export const setSpatialMeshPosition = (
  options: SetSpatialMeshPositionOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)
  if (
    node?.kind !== 'deformer' ||
    node.deformerType !== 'spatial' ||
    node.spatialMesh === undefined ||
    isSceneNodeLocked(options.document, node.id) ||
    options.position.some((coordinate) => !Number.isFinite(coordinate))
  ) {
    return undefined
  }
  const mesh = node.spatialMesh
  const parts = options.document.parts.map((part) =>
    part.spatial?.groupId === node.id ? rebindPart(part, mesh, options.position) : part,
  )
  if (parts.some((part) => part === undefined)) {
    return undefined
  }
  return {
    ...options.document,
    parts: parts.filter((part): part is PuppetPart => part !== undefined),
    scene: {
      ...scene,
      roots: updateNode(scene.roots, node.id, (candidate) =>
        candidate.kind === 'deformer'
          ? {...candidate, spatialMeshPosition: options.position}
          : candidate,
      ),
    },
  }
}
