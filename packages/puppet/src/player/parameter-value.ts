import {clamp} from 'es-toolkit/math'

import type {PuppetParameter} from './document'

const getNearestOptionValue = (parameter: PuppetParameter, value: number) =>
  parameter.options?.reduce(
    (nearest, option) =>
      Math.abs(option.value - value) < Math.abs(nearest - value) ? option.value : nearest,
    parameter.options[0]?.value ?? parameter.defaultValue,
  ) ?? value

export const resolveParameterValue = (parameter: PuppetParameter, value: number | undefined) => {
  const finiteValue =
    value === undefined || !Number.isFinite(value) ? parameter.defaultValue : value
  const boundedValue = clamp(finiteValue, parameter.minimum, parameter.maximum)
  return getNearestOptionValue(parameter, boundedValue)
}
