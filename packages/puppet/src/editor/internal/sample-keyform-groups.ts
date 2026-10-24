import {
  composeParameterGroupDrawOrder,
  fromColorEffectCoordinates,
  getGroupRenderProperties,
  type PuppetParameterValues,
  sampleParameterCoordinates,
  toColorEffectCoordinates,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterGroupKeyform,
} from '../../player'
import {getRepeatRanges} from '../../player/parameter-value'
import {getSceneGroup} from './group-properties'

/**
 * Group entries for a new keyform of `binding` at `values`: each target group's opacity and
 * colors interpolated from the existing keyforms, so adding a keyform changes nothing.
 */
export const sampleKeyformGroups = (
  document: PuppetDocument,
  binding: PuppetParameterBinding,
  values: PuppetParameterValues,
): ReadonlyArray<PuppetParameterGroupKeyform> | undefined => {
  const entries = (binding.targetGroupIds ?? []).flatMap((groupId) => {
    const group = getSceneGroup(document, groupId)
    if (group === undefined) {
      return []
    }
    const rest = getGroupRenderProperties(group)
    const coordinates = (properties: Partial<PuppetParameterGroupKeyform['properties']>) =>
      toColorEffectCoordinates({
        multiplyColor: properties.multiplyColor ?? rest.multiplyColor,
        opacity: properties.opacity ?? rest.opacity,
        screenColor: properties.screenColor ?? rest.screenColor,
      })
    const sampled = sampleParameterCoordinates({
      binding,
      keyformCoordinates: binding.keyforms.map((keyform) => {
        const properties = keyform.groups?.find((entry) => entry.groupId === groupId)?.properties
        return properties === undefined ? undefined : coordinates(properties)
      }),
      repeatRanges: getRepeatRanges(binding.parameterIds, document.parameters),
      restCoordinates: coordinates({}),
      values,
    })
    const keyedDrawOrder = binding.keyforms.some(
      (keyform) =>
        keyform.groups?.find((entry) => entry.groupId === groupId)?.properties.drawOrder !==
        undefined,
    )
    const effect = fromColorEffectCoordinates(sampled)
    return [
      {
        groupId,
        properties: keyedDrawOrder
          ? {
              ...effect,
              drawOrder: composeParameterGroupDrawOrder(
                {...document, parameterBindings: [{...binding, influences: undefined}]},
                group,
                Object.fromEntries(binding.parameterIds.map((id, index) => [id, values[index]!])),
              ),
            }
          : effect,
      },
    ]
  })
  return entries.length > 0 ? entries : undefined
}
