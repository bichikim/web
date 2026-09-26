import {bindSpatialPartToMesh} from '../../deformation/bind-spatial-mesh'
import type {
  PuppetDocument,
  PuppetPart,
  PuppetScene,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
} from '../../player'
import {createSpatialSurface} from './create-spatial-surface'

const collectSpatialGroups = (roots: ReadonlyArray<PuppetSceneNode>) => {
  const groups = new Map<string, PuppetSceneDeformerNode>()
  const members = new Map<string, string>()
  const visit = (nodes: ReadonlyArray<PuppetSceneNode>, parent?: string) => {
    for (const node of nodes) {
      if (node.kind === 'part') {
        if (parent !== undefined) {
          members.set(node.id, parent)
        }
      } else {
        const spatial = node.kind === 'deformer' && node.deformerType === 'spatial'
        if (spatial) {
          groups.set(node.id, node)
        }
        visit(node.children, spatial ? node.id : parent)
      }
    }
  }
  visit(roots)
  return {groups, members}
}

const reconcilePart = (
  part: PuppetPart,
  memberId: string | undefined,
  groups: ReadonlyMap<string, PuppetSceneDeformerNode>,
  previousGroupIds: ReadonlySet<string>,
): PuppetPart | undefined => {
  if (memberId === part.spatial?.groupId) {
    return part
  }
  if (memberId === undefined) {
    return part.spatial?.groupId !== undefined &&
      (groups.has(part.spatial.groupId) || previousGroupIds.has(part.spatial.groupId))
      ? {...part, spatial: undefined}
      : part
  }
  const spatial = {...createSpatialSurface(part), groupId: memberId}
  const grouped = {...part, spatial}
  const deformer = groups.get(memberId)
  const mesh = deformer?.spatialMesh
  return mesh === undefined
    ? grouped
    : bindSpatialPartToMesh(grouped, mesh, deformer?.spatialMeshPosition)
}

/** Keeps image vertices bound to the 3D deformer that now contains each part. */
export const reconcileSpatialGroups = (
  document: PuppetDocument,
  previousScene?: PuppetScene,
): PuppetDocument | undefined => {
  const {scene} = document
  if (scene === undefined) {
    return document
  }
  const {groups, members} = collectSpatialGroups(scene.roots)
  const previousGroupIds = new Set(collectSpatialGroups(previousScene?.roots ?? []).groups.keys())
  const parts = document.parts.map((part) =>
    reconcilePart(part, members.get(part.id), groups, previousGroupIds),
  )
  return parts.some((part) => part === undefined)
    ? undefined
    : {...document, parts: parts.filter((part): part is PuppetPart => part !== undefined)}
}
