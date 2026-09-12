/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {clampUnit} from '..'

describe('clampUnit', () => {
  it.each([
    [-1, 0],
    [-0.01, 0],
    [0, 0],
    [0.5, 0.5],
    [1, 1],
    [1.01, 1],
    [2, 1],
    [Number.NEGATIVE_INFINITY, 0],
    [Number.POSITIVE_INFINITY, 1],
  ] as const)('should clamp %j to %j', (value, result) => {
    expect(clampUnit(value)).toBe(result)
  })

  it('should return NaN for NaN', () => {
    expect(clampUnit(Number.NaN)).toBeNaN()
  })
})
