import {describe, expect, it} from 'vitest'

import {wrapDegrees} from '../index'

describe('wrapDegrees', () => {
  it.each([
    [0, 0],
    [90, 90],
    [359.75, 359.75],
    [360, 0],
    [450, 90],
    [1080.25, 0.25],
    [-90, 270],
    [-360, 0],
    [-450, 270],
    [-0.25, 359.75],
  ])('should wrap %s degrees to %s', (angle, expected) => {
    expect(wrapDegrees(angle)).toBe(expected)
  })

  it('should return positive zero for negative zero and subnormal angles', () => {
    expect(wrapDegrees(-0)).toBe(0)
    expect(wrapDegrees(Number.MIN_VALUE)).toBe(0)
    expect(wrapDegrees(-Number.MIN_VALUE)).toBe(0)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'should return NaN for %s',
    (angle) => {
      expect(wrapDegrees(angle)).toBeNaN()
    },
  )
})
