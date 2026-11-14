import type {PuppetDocument} from '../../../player'
import {getSceneNode} from '../scene-graph'

export const getSelectedDeformer = (document: PuppetDocument, nodeId?: string) => {
  const node = nodeId === undefined ? undefined : getSceneNode(document, nodeId)
  return node?.kind === 'deformer' ? node : undefined
}
