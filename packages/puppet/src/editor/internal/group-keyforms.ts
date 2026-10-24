import {
  getGroupRenderProperties,
  mapBindingKeyforms,
  type PuppetParameterValues,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterGroupKeyform,
  PuppetParameterKeyform,
} from '../../player'
import {getSceneGroup} from './group-properties'
import {getDocumentParameterBindings, getParameterBinding} from './parameter-keyforms'

type GroupKeyformProperties = PuppetParameterGroupKeyform['properties']

/** The keyform of `binding` at exactly `values`. */
export const findBindingKeyform = (
  binding: PuppetParameterBinding | undefined,
  values: PuppetParameterValues,
): PuppetParameterKeyform | undefined =>
  binding?.keyforms.find(
    (keyform) =>
      keyform.values.length === values.length &&
      keyform.values.every((value, index) => value === values[index]),
  )

const mapKeyforms = (
  binding: PuppetParameterBinding,
  update: <Keyform extends PuppetParameterKeyform>(keyform: Keyform) => Keyform,
): PuppetParameterBinding => mapBindingKeyforms(binding, update)

const replaceBinding = (
  document: PuppetDocument,
  bindingId: string,
  update: (binding: PuppetParameterBinding) => PuppetParameterBinding,
): PuppetDocument => ({
  ...document,
  parameterBindings: getDocumentParameterBindings(document).map((binding) =>
    binding.id === bindingId ? update(binding) : binding,
  ),
})

export const isGroupConnected = (
  document: PuppetDocument,
  bindingId: string | undefined,
  groupId: string,
) =>
  bindingId !== undefined &&
  getParameterBinding(document, bindingId)?.targetGroupIds?.includes(groupId) === true

/** Keys the group's opacity and colors on the binding, every keyform starting at rest. */
export const connectParameterGroup = (
  document: PuppetDocument,
  bindingId: string,
  groupId: string,
): PuppetDocument | undefined => {
  const group = getSceneGroup(document, groupId)
  if (
    group === undefined ||
    getParameterBinding(document, bindingId) === undefined ||
    isGroupConnected(document, bindingId, groupId)
  ) {
    return undefined
  }
  const {multiplyColor, opacity, screenColor} = getGroupRenderProperties(group)
  const entry: PuppetParameterGroupKeyform = {
    groupId,
    properties: {multiplyColor, opacity, screenColor},
  }
  return replaceBinding(document, bindingId, (binding) => ({
    ...mapKeyforms(binding, (keyform) => ({
      ...keyform,
      groups: [...(keyform.groups ?? []), entry],
    })),
    targetGroupIds: [...(binding.targetGroupIds ?? []), groupId],
  }))
}

export const disconnectParameterGroup = (
  document: PuppetDocument,
  bindingId: string,
  groupId: string,
): PuppetDocument | undefined =>
  isGroupConnected(document, bindingId, groupId)
    ? replaceBinding(document, bindingId, (binding) => {
        const targetGroupIds = binding.targetGroupIds?.filter((id) => id !== groupId) ?? []
        return {
          ...mapKeyforms(binding, (keyform) => {
            const groups = keyform.groups?.filter((entry) => entry.groupId !== groupId) ?? []
            return {...keyform, groups: groups.length > 0 ? groups : undefined}
          }),
          targetGroupIds: targetGroupIds.length > 0 ? targetGroupIds : undefined,
        }
      })
    : undefined

/** The group's stored properties in the keyform at `values`. */
export const getKeyformGroupProperties = (
  document: PuppetDocument,
  bindingId: string,
  values: PuppetParameterValues,
  groupId: string,
): GroupKeyformProperties | undefined =>
  findBindingKeyform(getParameterBinding(document, bindingId), values)?.groups?.find(
    (entry) => entry.groupId === groupId,
  )?.properties

/** Sets the group's opacity or colors in the keyform at `values`. */
export const setKeyformGroupProperties = (options: {
  readonly bindingId: string
  readonly document: PuppetDocument
  readonly groupId: string
  readonly properties: GroupKeyformProperties
  readonly values: PuppetParameterValues
}): PuppetDocument | undefined => {
  const target = findBindingKeyform(
    getParameterBinding(options.document, options.bindingId),
    options.values,
  )
  if (
    target === undefined ||
    getKeyformGroupProperties(
      options.document,
      options.bindingId,
      options.values,
      options.groupId,
    ) === undefined
  ) {
    return undefined
  }
  return replaceBinding(options.document, options.bindingId, (binding) =>
    mapKeyforms(binding, (keyform) =>
      keyform.values === target.values
        ? {
            ...keyform,
            groups: keyform.groups?.map((entry) =>
              entry.groupId === options.groupId
                ? {...entry, properties: {...entry.properties, ...options.properties}}
                : entry,
            ),
          }
        : keyform,
    ),
  )
}
