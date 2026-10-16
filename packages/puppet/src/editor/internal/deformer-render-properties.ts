import {mapBindingKeyforms, type PuppetParameterValues} from '../../deformation'
import {
  getDocumentScene,
  type PuppetDeformerRenderProperties,
  type PuppetDocument,
  type PuppetParameterDeformerKeyform,
  type PuppetSceneDeformerNode,
} from '../../player'
import {findBindingKeyform} from './group-keyforms'
import {getDocumentParameterBindings, getParameterBinding} from './parameter-keyforms'
import {getSceneNode} from './scene-graph'
import {updateNode} from './scene-tree'

/** The selected keyform of the active parameter. */
export interface DeformerKeyformTarget {
  readonly bindingId: string
  readonly values: PuppetParameterValues
}

export const getSceneDeformer = (
  document: PuppetDocument,
  nodeId: string | undefined,
): PuppetSceneDeformerNode | undefined => {
  const node = nodeId === undefined ? undefined : getSceneNode(document, nodeId)
  return node?.kind === 'deformer' ? node : undefined
}

/** The deformer's entry in the keyform at `target`, when the binding moves the deformer. */
export const getDeformerKeyformEntry = (
  document: PuppetDocument,
  nodeId: string,
  target: DeformerKeyformTarget | undefined,
): PuppetParameterDeformerKeyform | undefined => {
  const binding = target === undefined ? undefined : getParameterBinding(document, target.bindingId)
  return binding?.targetDeformerIds?.includes(nodeId) === true && target !== undefined
    ? findBindingKeyform(binding, target.values)?.deformers?.find(
        (entry) => entry.nodeId === nodeId,
      )
    : undefined
}

const setKeyformEntry = (
  document: PuppetDocument,
  nodeId: string,
  target: DeformerKeyformTarget,
  update: (entry: PuppetParameterDeformerKeyform) => PuppetParameterDeformerKeyform,
): PuppetDocument => {
  const keyform = findBindingKeyform(getParameterBinding(document, target.bindingId), target.values)
  return {
    ...document,
    parameterBindings: getDocumentParameterBindings(document).map((binding) =>
      binding.id === target.bindingId
        ? mapBindingKeyforms(binding, (candidate) =>
            candidate.values === keyform?.values
              ? {
                  ...candidate,
                  deformers: candidate.deformers?.map((entry) =>
                    entry.nodeId === nodeId ? update(entry) : entry,
                  ),
                }
              : candidate,
          )
        : binding,
    ),
  }
}

/**
 * Merges opacity or colors into the deformer's entry in the selected keyform when the binding
 * moves the deformer, else into its rest properties.
 */
export const setDeformerRenderProperties = (options: {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly properties: PuppetDeformerRenderProperties
  readonly target?: DeformerKeyformTarget
}): PuppetDocument | undefined => {
  const {document, nodeId, properties, target} = options
  if (getSceneDeformer(document, nodeId) === undefined) {
    return undefined
  }
  if (target !== undefined && getDeformerKeyformEntry(document, nodeId, target) !== undefined) {
    return setKeyformEntry(document, nodeId, target, (entry) => ({
      ...entry,
      properties: {...entry.properties, ...properties},
    }))
  }
  return {
    ...document,
    scene: {
      roots: updateNode(getDocumentScene(document).roots, nodeId, (node) =>
        node.kind === 'deformer'
          ? {...node, properties: {...node.properties, ...properties}}
          : node,
      ),
    },
  }
}

/**
 * Sets a rotation deformer's scale in the selected keyform. The scale is a keyed pose, like the
 * angle, so it has no rest value to set without a keyform.
 */
export const setDeformerRotationScale = (options: {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly rotationScale: number
  readonly target: DeformerKeyformTarget
}): PuppetDocument | undefined => {
  const {document, nodeId, rotationScale, target} = options
  return getSceneDeformer(document, nodeId)?.deformerType === 'rotation' &&
    rotationScale > 0 &&
    getDeformerKeyformEntry(document, nodeId, target) !== undefined
    ? setKeyformEntry(document, nodeId, target, (entry) => ({...entry, rotationScale}))
    : undefined
}
