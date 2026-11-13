import type {PuppetParameter} from '@winter-love/puppet/player'
import type {ParameterGroup} from './types'
export const getGroupParameter = (group: ParameterGroup): PuppetParameter => ({
  defaultValue: 0,
  id: `group:${group.id}`,
  maximum: 1,
  minimum: 0,
  name: group.name,
})
export const getRuntimeParameters = (
  parameters: ReadonlyArray<PuppetParameter>,
  groups: ReadonlyArray<ParameterGroup>,
  drafts: ReadonlyArray<string> = [],
) => [
  ...parameters,
  ...groups.filter((group) => group.mode === 'broadcast').map(getGroupParameter),
  ...drafts.map((id) => ({defaultValue: 0, id, maximum: 1, minimum: 0, name: '출력 보정'})),
]
export const parseParameterGroups = (
  value: unknown,
  parameters: ReadonlyArray<PuppetParameter>,
): ReadonlyArray<ParameterGroup> | undefined => {
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value)) {
    return undefined
  }
  const identifiers = new Set<string>()
  const members = new Set<string>()
  const parametersById = new Set(parameters.map((parameter) => parameter.id))
  const valid = value.every((group) => {
    if (
      typeof group !== 'object' ||
      group === null ||
      typeof group.id !== 'string' ||
      !group.id ||
      identifiers.has(group.id) ||
      parametersById.has(`group:${group.id}`) ||
      typeof group.name !== 'string' ||
      !group.name.trim() ||
      !['folder', 'broadcast'].includes(group.mode) ||
      ('collapsed' in group && typeof group.collapsed !== 'boolean') ||
      !Array.isArray(group.parameterIds)
    ) {
      return false
    }
    identifiers.add(group.id)
    return group.parameterIds.every((id: unknown) => {
      if (typeof id !== 'string' || !parametersById.has(id) || members.has(id)) {
        return false
      }
      members.add(id)
      return true
    })
  })
  return valid ? (value as ReadonlyArray<ParameterGroup>) : undefined
}
