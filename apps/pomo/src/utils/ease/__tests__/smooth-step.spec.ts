/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {smoothStep} from '..'

describe('smoothStep', () => {
  it.each([
    [-1, 5],
    [0, 0],
    [0.25, 0.15625],
    [0.5, 0.5],
    [0.75, 0.84375],
    [1, 1],
    [2, -4],
  ])('should transform progress %s to %s without clamping', (progress, expected) => {
    expect(smoothStep(progress)).toBe(expected)
  })

  it('should preserve NaN progress', () => {
    expect(smoothStep(NaN)).toBeNaN()
  })
})
