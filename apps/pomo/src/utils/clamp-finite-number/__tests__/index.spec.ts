import {expect, it} from 'vitest'
import {clampFiniteNumber} from '..'

it.each([
  [undefined, undefined],
  [NaN, undefined],
  [Infinity, undefined],
  [-Infinity, undefined],
  [-5, 0],
  [25.5, 25.5],
  [120, 100],
])('should clamp %s to %s within percentage bounds', (value, expected) => {
  expect(clampFiniteNumber(value, 0, 100)).toBe(expected)
})

it.each([
  [-20, -10, 10, -10],
  [20, -10, 10, 10],
  [5, -10, 10, 5],
  [0.75, 0, 1, 0.75],
  [2, 0, 1, 1],
  [10, 5, 5, 5],
])('should clamp %s within [%s, %s] to %s', (value, min, max, expected) => {
  expect(clampFiniteNumber(value, min, max)).toBe(expected)
})
