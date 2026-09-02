import {
  getScenePartStates,
  isSceneContainerNode,
  type PuppetDocument,
  type PuppetSceneNode,
} from '../../player'
import {getSceneNode, isSceneNodeLocked, type SceneSelection} from './scene-graph'
import type {SceneContainerConversion} from './container-conversion'

export interface SceneSelectionActions {
  readonly autoMeshPartIds: ReadonlyArray<string>
  readonly containerConversion?: SceneContainerConversion
  readonly containerIds: ReadonlyArray<string>
  readonly singleNodeId?: string
}

export const createSceneSelection = (nodeId: string | null): SceneSelection => ({
  activeNodeId: nodeId,
  nodeIds: nodeId === null ? [] : [nodeId],
})

export const getSelectedPartId = (document: PuppetDocument, selection: SceneSelection) => {
  const node =
    selection.activeNodeId === null ? undefined : getSceneNode(document, selection.activeNodeId)
  return node?.kind === 'part' ? node.id : null
}

const getContainerConversion = (
  document: PuppetDocument,
  nodes: ReadonlyArray<PuppetSceneNode>,
): SceneContainerConversion | undefined => {
  if (
    nodes.length > 0 &&
    nodes.every((node) => (node.kind === 'group' ? !isSceneNodeLocked(document, node.id) : false))
  ) {
    return {nodeIds: nodes.map((node) => node.id), targetKind: 'deformer'}
  }

  if (
    nodes.length > 0 &&
    nodes.every((node) =>
      node.kind === 'deformer' ? !isSceneNodeLocked(document, node.id) : false,
    )
  ) {
    return {nodeIds: nodes.map((node) => node.id), targetKind: 'group'}
  }

  return undefined
}

export const getSceneSelectionActions = (
  document: PuppetDocument,
  selection: SceneSelection,
): SceneSelectionActions => {
  const nodes = selection.nodeIds.flatMap((nodeId) => {
    const node = getSceneNode(document, nodeId)
    return node === undefined ? [] : [node]
  })
  const partStates = new Map(
    getScenePartStates(document).map((state) => [state.partId, state] as const),
  )
  const allPartsAvailable =
    nodes.length > 0 &&
    nodes.length === selection.nodeIds.length &&
    nodes.every((node) => {
      const state = node.kind === 'part' ? partStates.get(node.id) : undefined
      return state?.visible === true && !state.locked
    })
  const allContainersAvailable =
    nodes.length > 0 &&
    nodes.length === selection.nodeIds.length &&
    nodes.every((node) => isSceneContainerNode(node) && !isSceneNodeLocked(document, node.id))

  return {
    autoMeshPartIds: allPartsAvailable ? nodes.map((node) => node.id) : [],
    containerConversion:
      nodes.length === selection.nodeIds.length
        ? getContainerConversion(document, nodes)
        : undefined,
    containerIds: allContainersAvailable ? nodes.map((node) => node.id) : [],
    singleNodeId: nodes.length === 1 ? nodes[0]?.id : undefined,
  }
}
