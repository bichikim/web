import {expect, it} from 'vitest'
import {cosineEaseInOut} from '..'

it.each([
  [-1, 0],
  [0, 0],
  [0.5, 0.5],
  [1, 1],
  [2, 1],
])('should ease bounded progress %s to %s', (progress, expected) =>
  expect(cosineEaseInOut(progress)).toBeCloseTo(expected),
)
