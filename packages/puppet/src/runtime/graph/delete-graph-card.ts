import type {RuntimeProfile} from '../../tracking/types'
import {getInputNode} from '../../tracking/tracking-inputs'
interface DeleteGraphCardOptions {
  readonly id: string
  readonly profile: RuntimeProfile
}
export const deleteGraphCard = (options: DeleteGraphCardOptions) => {
  const {id, profile} = options
  const group = profile.groups?.find((group) => id === `parameter:group:${group.id}`)
  const parameterId = id.replace(/^(?:mapping:|parameter:)/u, '')
  const source = ['tracking', 'manual', 'button'].includes(id)
  return {
    keepParameters:
      group?.parameterIds ??
      (source
        ? profile.mappings
            .filter((mapping) => getInputNode(mapping.input) === id)
            .map((mapping) => mapping.parameterId)
        : id.startsWith('mapping:')
          ? [parameterId]
          : []),
    profile: {
      ...profile,
      drafts: profile.drafts?.filter((id) => id !== parameterId),
      groups: profile.groups
        ?.filter((candidate) => candidate.id !== group?.id)
        .map((candidate) => ({
          ...candidate,
          parameterIds: id.startsWith('parameter:')
            ? candidate.parameterIds.filter((member) => member !== parameterId)
            : candidate.parameterIds,
        })),
      mappings: profile.mappings.filter((mapping) =>
        source ? getInputNode(mapping.input) !== id : mapping.parameterId !== parameterId,
      ),
    },
  }
}
