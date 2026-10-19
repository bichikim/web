import {
  AGENT_STATES,
  type AgentSignals,
  type AgentStateBindings,
} from '@winter-love/wallpaper/settings/agent-state'
import type {TrackingParameter} from '../tracking/types'

/** Maps connected state inputs to bounded parameter values; active inputs win when sharing a parameter. */
export const agentParameters = (
  parameters: readonly TrackingParameter[],
  bindings: AgentStateBindings,
  states: AgentSignals,
): Readonly<Record<string, number>> => {
  const inputs = AGENT_STATES.flatMap(({value: key}) => {
    const binding = bindings[key]
    const parameter = parameters.find((item) => item.id === binding?.parameterId)
    return binding === undefined || parameter === undefined
      ? []
      : [{binding, enabled: states[key] === true, parameter}]
  })
  const ordered = [
    ...inputs.filter((item) => !item.enabled),
    ...inputs.filter((item) => item.enabled),
  ]
  return Object.fromEntries(
    ordered.map(({binding, enabled, parameter}) => {
      const value = enabled
        ? (binding.on ?? parameter.maximum)
        : (binding.off ?? parameter.defaultValue)
      return [parameter.id, Math.max(parameter.minimum, Math.min(parameter.maximum, value))]
    }),
  )
}
