import {clamp} from 'es-toolkit/math'

import type {PuppetParameter} from './document'

const getNearestOptionValue = (parameter: PuppetParameter, value: number) =>
  parameter.options?.reduce(
    (nearest, option) =>
      Math.abs(option.value - value) < Math.abs(nearest - value) ? option.value : nearest,
    parameter.options[0]?.value ?? parameter.defaultValue,
  ) ?? value

/** Limits `value` to the parameter's range, or wraps it there when the parameter repeats. */
export const boundParameterValue = (parameter: PuppetParameter, value: number) => {
  if (parameter.repeat !== true) {
    return clamp(value, parameter.minimum, parameter.maximum)
  }
  const span = parameter.maximum - parameter.minimum
  const offset = (value - parameter.minimum) % span
  return parameter.minimum + (offset < 0 ? offset + span : offset)
}

/** Repeat ranges of a binding's parameters, for keyform sampling. */
export const getRepeatRanges = (
  parameterIds: ReadonlyArray<string>,
  parameters: ReadonlyArray<PuppetParameter> | undefined,
): ReadonlyArray<readonly [number, number] | undefined> =>
  parameterIds.map((id) => {
    const parameter = parameters?.find((candidate) => candidate.id === id)
    return parameter?.repeat === true ? [parameter.minimum, parameter.maximum] : undefined
  })

export const resolveParameterValue = (parameter: PuppetParameter, value: number | undefined) => {
  const finiteValue =
    value === undefined || !Number.isFinite(value) ? parameter.defaultValue : value
  return getNearestOptionValue(parameter, boundParameterValue(parameter, finiteValue))
}
