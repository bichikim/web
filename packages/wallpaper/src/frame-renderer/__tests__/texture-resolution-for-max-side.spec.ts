import {expect, it} from 'vitest'
import {textureResolutionForMaxSide} from '../texture-resolution-for-max-side'

it.each([
  [2048, 1024, 0.5],
  [1024, 256, 0.25],
  [100, 256, 1],
  [0, 256, 1],
])('should cap side %s to %s with resolution %s', (side, limit, expected) =>
  expect(textureResolutionForMaxSide(side, limit)).toBe(expected),
)
