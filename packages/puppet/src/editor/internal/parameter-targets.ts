import {getDocumentScene, type PuppetDocument, type PuppetSceneNode} from '../../player'
import type {SceneSelection} from './scene-graph'

const findNode = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
): PuppetSceneNode | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }

    if (node.kind !== 'part') {
      const child = findNode(node.children, nodeId)
      if (child !== undefined) {
        return child
      }
    }
  }

  return undefined
}

export interface GetParameterSelectionNodeIdsOptions {
  readonly document: PuppetDocument
  readonly selection: SceneSelection
}

export const getParameterSelectionNodeIds = (options: GetParameterSelectionNodeIdsOptions) => {
  const nodeIds = new Set<string>()

  for (const nodeId of options.selection.nodeIds) {
    const node = findNode(getDocumentScene(options.document).roots, nodeId)
    if (node !== undefined && node.kind !== 'group') {
      nodeIds.add(node.id)
    }
  }

  return [...nodeIds]
}
