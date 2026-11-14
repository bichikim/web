import type {PuppetDocument} from '../player'
import {getSceneNode, type SceneSelection} from './internal/scene-graph'

/** Retains the same selection object unless the host document removed a selected target. */
export const reconcileSceneSelection = (
  document: PuppetDocument,
  selection: SceneSelection,
): SceneSelection => {
  const nodeIds = selection.nodeIds.filter((id) => getSceneNode(document, id) !== undefined)
  if (nodeIds.length === selection.nodeIds.length) {
    return selection
  }
  return {
    activeNodeId: nodeIds.includes(selection.activeNodeId ?? '')
      ? selection.activeNodeId
      : (nodeIds[0] ?? null),
    nodeIds,
  }
}
