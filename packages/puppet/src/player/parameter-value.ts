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

type RepeatRanges = ReadonlyArray<readonly [number, number] | undefined>

const repeatRanges = new WeakMap<
  ReadonlyArray<PuppetParameter>,
  WeakMap<ReadonlyArray<string>, RepeatRanges>
>()

/** Repeat ranges for keyform sampling; immutable definitions and binding IDs share metadata. */
export const getRepeatRanges = (
  parameterIds: ReadonlyArray<string>,
  parameters: ReadonlyArray<PuppetParameter> | undefined,
): RepeatRanges => {
  if (parameters === undefined) {
    return parameterIds.map(() => undefined)
  }
  let byBinding = repeatRanges.get(parameters)
  if (byBinding === undefined) {
    byBinding = new WeakMap()
    repeatRanges.set(parameters, byBinding)
  }
  const cached = byBinding.get(parameterIds)
  if (cached !== undefined) {
    return cached
  }
  const ranges = parameterIds.map((id): readonly [number, number] | undefined => {
    const parameter = parameters?.find((candidate) => candidate.id === id)
    return parameter?.repeat === true ? [parameter.minimum, parameter.maximum] : undefined
  })
  byBinding.set(parameterIds, ranges)
  return ranges
}

export const resolveParameterValue = (parameter: PuppetParameter, value: number | undefined) => {
  const finiteValue =
    value === undefined || !Number.isFinite(value) ? parameter.defaultValue : value
  return getNearestOptionValue(parameter, boundParameterValue(parameter, finiteValue))
}
