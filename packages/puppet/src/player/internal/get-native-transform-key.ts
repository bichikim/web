import {getDeformerShape} from '../../deformation/binding'
import {getTargetBindings} from '../../deformation/target-bindings'
import type {PuppetDocument, PuppetSceneDeformerNode} from '../document'

/** Identifies identical coordinate calculations; scene identity and display properties stay separate. */
export const getNativeTransformKey = (
  document: PuppetDocument,
  node: PuppetSceneDeformerNode,
): string => {
  const bindings = getTargetBindings(document.parameterBindings ?? [], 'targetDeformerIds', node.id)
  const inputs = bindings.map((binding) => ({
    influenceMode: binding.influenceMode,
    influences: binding.influences,
    interpolation: binding.interpolation,
    keyformRange: binding.keyformRange,
    keyforms: binding.keyforms.map((form) => {
      const keyed = form.deformers?.find((deformer) => deformer.nodeId === node.id)
      if (keyed === undefined) {
        return {values: form.values}
      }
      const {nodeId: _nodeId, properties: _properties, ...coordinates} = keyed
      return {coordinates, values: form.values}
    }),
    parameterIds: binding.parameterIds,
    sampling: binding.sampling,
  }))
  // JSON's default normalization would merge -0 with +0 and change cancellation at the boundary.
  return JSON.stringify([getDeformerShape(node), inputs], (_key, value: unknown) =>
    typeof value === 'number' && Object.is(value, -0) ? 'number:-0' : value,
  )
}
