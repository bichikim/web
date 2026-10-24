import {rebindDeformer, sameDeformerShape} from '../../deformation/binding'
import {getDocumentScene, type PuppetDocument} from '../../player'
import {findNode, findNodeLock, updateNode} from './scene-tree'

/** Preserves the selected deformer mapping across an unbound layout edit. */
export const preserveDeformerPlacement = (
  before: PuppetDocument,
  after: PuppetDocument,
  nodeId: string | undefined,
): PuppetDocument => {
  if (nodeId === undefined || !isDeformerRestEditable(before, nodeId)) {
    return after
  }
  const source = findNode(getDocumentScene(before).roots, nodeId)
  const scene = getDocumentScene(after)
  const target = findNode(scene.roots, nodeId)
  if (
    source?.kind !== 'deformer' ||
    target?.kind !== 'deformer' ||
    sameDeformerShape(source, target)
  ) {
    return after
  }
  return {
    ...after,
    scene: {...scene, roots: updateNode(scene.roots, nodeId, () => rebindDeformer(source, target))},
  }
}

export const isDeformerRestEditable = (document: PuppetDocument, nodeId: string): boolean =>
  !findNodeLock(getDocumentScene(document).roots, nodeId) &&
  !document.parameterBindings?.some(
    (binding) =>
      binding.targetDeformerIds?.includes(nodeId) ||
      binding.keyforms.some((keyform) => keyform.deformers?.some((node) => node.nodeId === nodeId)),
  )
