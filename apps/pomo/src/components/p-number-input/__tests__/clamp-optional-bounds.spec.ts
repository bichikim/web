import {expect, it} from 'vitest'

import {clampOptionalBounds} from '../clamp-optional-bounds'

it.each([
  [4, undefined, undefined, 4],
  [-1, 0, undefined, 0],
  [11, undefined, 10, 10],
  [5, 0, 10, 5],
  [15, 0, 10, 10],
  [5, 10, 0, 0],
] as const)('should clamp %s within optional bounds %s and %s', (value, min, max, expected) => {
  expect(clampOptionalBounds(value, min, max)).toBe(expected)
})
