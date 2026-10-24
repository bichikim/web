import type {PuppetParameterValueMap} from '../deformation'
import type {PuppetDocument} from './document'
import {resolveParameterValue} from './parameter-value'

/** Adds the mouth `level` to every lip-sync parameter, within its range. */
export const applyLipSync = (
  document: PuppetDocument,
  values: PuppetParameterValueMap,
  level: number,
): PuppetParameterValueMap => {
  const ids = new Set(document.parameterRoles?.lipSync ?? [])
  return Object.fromEntries(
    Object.entries(values).map(([id, value]) => {
      const parameter = document.parameters?.find((candidate) => candidate.id === id)
      return [
        id,
        parameter === undefined || !ids.has(id)
          ? value
          : resolveParameterValue(parameter, value + level),
      ]
    }),
  )
}
