import type {PuppetParameterValueMap} from '../deformation'
import type {PuppetDocument} from './document'
import {resolveParameterValue} from './parameter-value'

/** Adds the mouth `level` to every lip-sync parameter, within its range. */
export const applyLipSync = (
  document: PuppetDocument,
  values: PuppetParameterValueMap,
  level: number,
): PuppetParameterValueMap => {
  const adjusted = (document.parameterRoles?.lipSync ?? []).flatMap((id) => {
    const parameter = document.parameters?.find((candidate) => candidate.id === id)
    if (parameter === undefined) {
      return []
    }
    const current = Object.hasOwn(values, id) ? values[id] : parameter.defaultValue
    return [[id, resolveParameterValue(parameter, current + level)]]
  })
  return {...values, ...Object.fromEntries(adjusted)}
}
