import {isGroupControlled} from './is-group-controlled'
import {type PuppetParameter, type PuppetParameterValueMap} from '@winter-love/puppet/player'

import type {ParameterGroup} from './types'
interface ExpandGroupValuesOptions {
  readonly parameters: ReadonlyArray<PuppetParameter>
  readonly groups: ReadonlyArray<ParameterGroup>
  readonly values: PuppetParameterValueMap
}
export const expandGroupValues = (options: ExpandGroupValuesOptions): PuppetParameterValueMap => {
  const parameters = new Map(options.parameters.map((parameter) => [parameter.id, parameter]))
  const grouped = Object.fromEntries(
    options.groups.flatMap((group) => {
      const value = options.values[`group:${group.id}`]
      if (group.mode !== 'broadcast' || value === undefined) {
        return []
      }
      const amount = Math.min(1, Math.max(0, value))
      return group.parameterIds.flatMap((id) => {
        const parameter = parameters.get(id)
        return parameter === undefined
          ? []
          : [[id, parameter.minimum + amount * (parameter.maximum - parameter.minimum)]]
      })
    }),
  )
  return {
    ...grouped,
    ...Object.fromEntries(
      Object.entries(options.values).filter(
        ([id]) =>
          parameters.has(id) && !isGroupControlled({groups: options.groups, parameterId: id}),
      ),
    ),
  }
}
