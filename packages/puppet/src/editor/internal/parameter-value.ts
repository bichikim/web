import {clamp} from 'es-toolkit/math'

import type {PuppetParameter} from '../../player/document'

const PERCENT = 100
const VALUE_PRECISION = 6
const VALUE_STEPS = 120

export const getParameterProgress = (parameter: PuppetParameter, value: number) =>
  ((value - parameter.minimum) / (parameter.maximum - parameter.minimum)) * PERCENT

export const getParameterPointerValue = (
  parameter: PuppetParameter,
  start: number,
  size: number,
  point: number,
) => {
  if (size <= 0) {
    return parameter.defaultValue
  }

  const progress = clamp((point - start) / size, 0, 1)
  const value = parameter.minimum + progress * (parameter.maximum - parameter.minimum)
  const step = (parameter.maximum - parameter.minimum) / VALUE_STEPS
  return Number(
    clamp(
      parameter.minimum + Math.round((value - parameter.minimum) / step) * step,
      parameter.minimum,
      parameter.maximum,
    ).toFixed(VALUE_PRECISION),
  )
}

export const getParameterKeyboardValue = (
  parameter: PuppetParameter,
  value: number,
  key: string,
) => {
  const step = (parameter.maximum - parameter.minimum) / VALUE_STEPS
  let nextValue: number

  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      nextValue = value - step
      break
    case 'ArrowRight':
    case 'ArrowUp':
      nextValue = value + step
      break
    case 'End':
      nextValue = parameter.maximum
      break
    case 'Home':
      nextValue = parameter.minimum
      break
    default:
      return undefined
  }

  return Number(clamp(nextValue, parameter.minimum, parameter.maximum).toFixed(VALUE_PRECISION))
}
