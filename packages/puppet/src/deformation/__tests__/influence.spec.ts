import {describe, expect, test} from 'vitest'

import {createDemoDocument, type PuppetParameterBinding} from '../../player'
import {getBindingInfluence} from '../influence'

const document = createDemoDocument()
const base = document.parameterBindings![0]!
const curve = {
  parameterId: 'angle-y',
  points: [
    {value: -30, weight: 1},
    {value: 0, weight: 0.8},
    {value: 30, weight: 0},
  ],
}

const sample = (influences: PuppetParameterBinding['influences'], values = {}) =>
  getBindingInfluence({binding: {...base, influences}, document, parameterValues: values})

describe('getBindingInfluence', () => {
  test('should preserve existing bindings and use the parameter default', () => {
    expect(sample(undefined)).toBe(1)
    expect(sample([])).toBe(1)
    expect(sample([curve])).toBe(0.8)
  })
  test('should interpolate, clamp inputs and use defaults for non-finite inputs', () => {
    expect(sample([curve], {'angle-y': 15})).toBeCloseTo(0.4)
    expect(sample([curve], {'angle-y': 100})).toBe(0)
    expect(sample([curve], {'angle-y': -100})).toBe(1)
    expect(sample([curve], {'angle-y': NaN})).toBe(0.8)
  })
  test('should hold endpoint weights outside the curve and support a constant curve', () => {
    expect(sample([{...curve, points: [{value: 0, weight: 0.3}]}], {'angle-y': -30})).toBe(0.3)
  })
  test('should take the minimum relation without recursively changing source inputs', () => {
    const relations = [curve, {parameterId: 'angle-x', points: [{value: 0, weight: 0.6}]}]
    expect(sample(relations)).toBe(0.6)
    expect(sample([...relations].reverse())).toBe(0.6)
  })
})
