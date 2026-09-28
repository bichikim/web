import {
  isTwoDimensionalParameterBinding,
  parameterValuesEqual,
  type PuppetParameterValues,
} from '../../deformation'
import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetParameterDeformerKeyform,
  type PuppetParameterKeyform,
  type PuppetScene,
  type PuppetSceneDeformerNode,
} from '../../player'
import {
  getDocumentParameterBindings,
  getParameterBinding,
  getParameterTargetDeformerIds,
} from './parameter-keyforms'
import {getParameterEditTarget, type GetParameterEditTargetOptions} from './parameter-edit-target'
import {isSceneNodeLocked} from './scene-graph'
import {findNode, updateNode} from './scene-tree'
import {setSpatialMeshPosition} from './set-spatial-mesh-position'

export interface SetSpatialDeformerTransformOptions extends GetParameterEditTargetOptions {
  readonly document: PuppetDocument
  readonly previewDeformer?: PuppetSceneDeformerNode
  readonly property:
    | 'spatialMeshPosition'
    | 'spatialOrigin'
    | 'spatialRotation'
    | 'spatialScale'
    | 'spatialTranslation'
  readonly value: readonly [number, number, number]
}

interface SpatialKeyformTarget {
  readonly bindingId: string
  readonly values: PuppetParameterValues
}

const setRestTransform = (options: SetSpatialDeformerTransformOptions, scene: PuppetScene) =>
  options.property === 'spatialMeshPosition'
    ? setSpatialMeshPosition({
        document: options.document,
        nodeId: options.nodeId,
        position: options.value,
      })
    : {
        ...options.document,
        scene: {
          ...scene,
          roots: updateNode(scene.roots, options.nodeId, (candidate) =>
            candidate.kind === 'deformer'
              ? {...candidate, [options.property]: options.value}
              : candidate,
          ),
        },
      }

const toStoredValue = (
  options: SetSpatialDeformerTransformOptions,
  node: PuppetSceneDeformerNode,
  stored: PuppetParameterDeformerKeyform,
): readonly [number, number, number] => {
  const rest =
    node[options.property] ??
    (options.property === 'spatialScale' ? ([1, 1, 1] as const) : ([0, 0, 0] as const))
  const current = stored[options.property] ?? rest
  const preview = options.previewDeformer?.[options.property]
  return [
    current[0] + options.value[0] - (preview?.[0] ?? current[0]),
    current[1] + options.value[1] - (preview?.[1] ?? current[1]),
    current[2] + options.value[2] - (preview?.[2] ?? current[2]),
  ]
}

const setKeyformTransform = (
  options: SetSpatialDeformerTransformOptions,
  node: PuppetSceneDeformerNode,
  target: SpatialKeyformTarget,
): PuppetDocument | undefined => {
  const binding = getParameterBinding(options.document, target.bindingId)
  const keyform = binding?.keyforms.find((candidate) =>
    parameterValuesEqual(candidate.values, target.values),
  )
  const stored = keyform?.deformers?.find((candidate) => candidate.nodeId === node.id)
  if (
    binding === undefined ||
    stored === undefined ||
    !getParameterTargetDeformerIds(binding).includes(node.id)
  ) {
    return undefined
  }

  const value = toStoredValue(options, node, stored)
  if (options.property === 'spatialScale' && value.some((coordinate) => coordinate <= 0)) {
    return undefined
  }
  const replace = <Keyform extends PuppetParameterKeyform>(candidate: Keyform): Keyform =>
    parameterValuesEqual(candidate.values, target.values)
      ? {
          ...candidate,
          deformers: candidate.deformers?.map((deformer) =>
            deformer.nodeId === node.id ? {...deformer, [options.property]: value} : deformer,
          ),
        }
      : candidate
  // Keep each binding's keyform value tuple width while replacing its deformer entry.
  const updated = isTwoDimensionalParameterBinding(binding)
    ? {...binding, keyforms: binding.keyforms.map(replace)}
    : {...binding, keyforms: binding.keyforms.map(replace)}
  return {
    ...options.document,
    parameterBindings: getDocumentParameterBindings(options.document).map((candidate) =>
      candidate.id === binding.id ? updated : candidate,
    ),
  }
}

/** Stores a spatial transform in the selected keyform or in the deformer rest pose. */
export const setSpatialDeformerTransform = (
  options: SetSpatialDeformerTransformOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)
  if (
    node?.kind !== 'deformer' ||
    node.deformerType !== 'spatial' ||
    isSceneNodeLocked(options.document, node.id) ||
    options.value.some(
      (value) => !Number.isFinite(value) || (options.property === 'spatialScale' && value <= 0),
    )
  ) {
    return undefined
  }
  const target = getParameterEditTarget(options)
  return target.kind === 'rest'
    ? setRestTransform(options, scene)
    : setKeyformTransform(options, node, target)
}
