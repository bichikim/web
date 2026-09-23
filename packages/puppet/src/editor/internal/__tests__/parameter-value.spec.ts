import {describe, expect, test} from 'vitest'

import type {PuppetParameter} from '../../../player'
import {getParameterKeyboardValue, getParameterPointerValue} from '../parameter-value'

const discreteParameter: PuppetParameter = {
  defaultValue: 0,
  id: 'eye-symbol',
  maximum: 2,
  minimum: 0,
  name: '눈동자 무늬',
  options: [
    {label: '기본', value: 0},
    {label: '하트', value: 1},
    {label: '표고버섯', value: 2},
  ],
}

describe('discrete parameter values', () => {
  test('should snap pointer input to the nearest option', () => {
    expect(getParameterPointerValue(discreteParameter, 0, 100, 30)).toBe(1)
    expect(getParameterPointerValue(discreteParameter, 0, 100, 90)).toBe(2)
  })

  test('should move keyboard input by one option', () => {
    expect(getParameterKeyboardValue(discreteParameter, 0, 'ArrowRight')).toBe(1)
    expect(getParameterKeyboardValue(discreteParameter, 1, 'ArrowRight')).toBe(2)
    expect(getParameterKeyboardValue(discreteParameter, 2, 'ArrowLeft')).toBe(1)
  })
})
