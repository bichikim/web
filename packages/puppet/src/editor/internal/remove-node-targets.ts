import {mapBindingKeyforms} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterKeyform,
} from '../../player/document'
import {getGroupOpacityRowId} from '../../player/timeline-rows'

/** Drops motions' group opacity tracks and timeline rows for the removed `nodeIds`. */
const removeGroupOpacityTracks = (
  document: PuppetDocument,
  nodeIds: ReadonlySet<string>,
): PuppetDocument => {
  const rowIds = new Set([...nodeIds].map(getGroupOpacityRowId))
  return {
    ...document,
    motions: document.motions.map((motion) => ({
      ...motion,
      timelineParameterIds: motion.timelineParameterIds?.filter((id) => !rowIds.has(id)),
      tracks: motion.tracks.filter(
        (track) => track.kind !== 'group-opacity' || !nodeIds.has(track.groupId),
      ),
    })),
  }
}

/**
 * Drops `nodeIds` as parameter targets: from bindings' targets and keyforms, and groups' opacity
 * tracks and rows. Callers change the scene themselves (unwrapping replaces the node with its
 * children; converting keeps it as another kind), so the scene and skinning are left as they
 * are. Removing nodes outright goes through `mapDocumentReferences` with `keepNode` instead,
 * which also drops them, their subtrees and skinning that uses them as joints.
 */
export const removeParameterNodeTargets = (
  document: PuppetDocument,
  nodeIds: ReadonlySet<string>,
) => removeGroupOpacityTracks(removeBindingNodeTargets(document, nodeIds), nodeIds)

const removeBindingNodeTargets = (
  document: PuppetDocument,
  nodeIds: ReadonlySet<string>,
): PuppetDocument => {
  if (document.parameterBindings === undefined) {
    return document
  }

  const removeKeyformTargets = <Keyform extends PuppetParameterKeyform>(
    keyform: Keyform,
  ): Keyform =>
    ({
      ...keyform,
      deformers: keyform.deformers?.filter((deformer) => !nodeIds.has(deformer.nodeId)),
      groups: keyform.groups?.filter((group) => !nodeIds.has(group.groupId)),
    }) as Keyform

  return {
    ...document,
    parameterBindings: document.parameterBindings.map((binding): PuppetParameterBinding => {
      const targets = {
        targetDeformerIds: binding.targetDeformerIds?.filter((id) => !nodeIds.has(id)),
        targetGroupIds: binding.targetGroupIds?.filter((id) => !nodeIds.has(id)),
      }
      return {...mapBindingKeyforms(binding, removeKeyformTargets), ...targets}
    }),
  }
}
