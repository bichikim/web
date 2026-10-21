import type {PuppetParameterValueMap} from '../deformation'
import type {PuppetDocument} from './document'
import {resolveParameterValue} from './parameter-value'

/**
 * Adds each breath parameter's `(offset + peak · sin(2π · time / period)) · weight` to its value,
 * within its range; `time` is seconds since breathing started.
 */
export const applyBreath = (
  document: PuppetDocument,
  values: PuppetParameterValueMap,
  time: number,
): PuppetParameterValueMap => {
  const next = {...values}
  for (const breath of document.breath ?? []) {
    const parameter = document.parameters?.find((candidate) => candidate.id === breath.parameterId)
    if (parameter !== undefined) {
      const wave = breath.offset + breath.peak * Math.sin((2 * Math.PI * time) / breath.period)
      const current = values[parameter.id] ?? parameter.defaultValue
      next[parameter.id] = resolveParameterValue(parameter, current + wave * breath.weight)
    }
  }
  return next
}
