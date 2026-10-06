import {expect, it} from 'vitest'
import {clampDisplayedPercentage} from '..'

it.each([
  [undefined, undefined],
  [NaN, undefined],
  [Infinity, undefined],
  [-Infinity, undefined],
  [-5, 0],
  [25.5, 25.5],
  [120, 100],
])('should display %s as %s without changing telemetry', (value, expected) => {
  expect(clampDisplayedPercentage(value)).toBe(expected)
})
