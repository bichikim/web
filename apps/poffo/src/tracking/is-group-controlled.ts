import type {ParameterGroup} from './types'
interface IsGroupControlledOptions {
  readonly groups: ReadonlyArray<ParameterGroup>
  readonly parameterId: string
}
export const isGroupControlled = (options: IsGroupControlledOptions) =>
  options.groups.some(
    (group) => group.mode === 'broadcast' && group.parameterIds.includes(options.parameterId),
  )
