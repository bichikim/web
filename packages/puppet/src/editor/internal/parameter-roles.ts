import type {PuppetDocument, PuppetParameterRoles} from '../../player/document'

export type ParameterRole = keyof PuppetParameterRoles

/** Adds or removes a parameter from an automatic-effect role, dropping empty roles. */
export const setParameterRole = (
  document: PuppetDocument,
  parameterId: string,
  role: ParameterRole,
  enabled: boolean,
): PuppetDocument => {
  const ids = (document.parameterRoles?.[role] ?? []).filter((id) => id !== parameterId)
  const nextIds = enabled ? [...ids, parameterId] : ids
  const {[role]: _previous, ...others} = document.parameterRoles ?? {}
  const roles = nextIds.length === 0 ? others : {...others, [role]: nextIds}
  const {parameterRoles: _roles, ...rest} = document
  return Object.keys(roles).length === 0 ? rest : {...rest, parameterRoles: roles}
}

/** Puts a parameter in a display group, or takes it out with `undefined`. */
export const setParameterGroup = (
  document: PuppetDocument,
  parameterId: string,
  groupId: string | undefined,
): PuppetDocument => ({
  ...document,
  parameters: document.parameters?.map((parameter) => {
    if (parameter.id !== parameterId) {
      return parameter
    }
    const {groupId: _previous, ...rest} = parameter
    return groupId === undefined ? rest : {...rest, groupId}
  }),
})

/** Adds a display group named `name` (trimmed) and returns its new ID. */
export const addParameterGroup = (document: PuppetDocument, name: string) => {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return undefined
  }
  const groups = document.parameterGroups ?? []
  const ids = new Set(groups.map((group) => group.id))
  let index = groups.length + 1
  while (ids.has(`group-${index}`)) {
    index += 1
  }
  const id = `group-${index}`
  return {document: {...document, parameterGroups: [...groups, {id, name: trimmed}]}, id}
}
