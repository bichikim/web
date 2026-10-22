/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {cosineEaseInOut} from '..'

describe('cosineEaseInOut', () => {
  it.each([
    [-1, 0],
    [0, 0],
    [0.25, 0.1464466094067262],
    [0.5, 0.5],
    [0.75, 0.8535533905932737],
    [1, 1],
    [2, 1],
  ])('should ease bounded progress %s to %s', (progress, expected) =>
    expect(cosineEaseInOut(progress)).toBeCloseTo(expected),
  )

  it.each([NaN, Infinity, -Infinity])(
    'should return zero for non-finite progress %s',
    (progress) => {
      expect(cosineEaseInOut(progress)).toBe(0)
    },
  )
})
