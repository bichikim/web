import {expect, test} from 'vitest'

import {
  normalizeRenderOverride,
  type PuppetRenderOverride,
  setRenderOverride,
} from '../render-overrides'

test('should keep overrides within 0..1 and drop empty ones', () => {
  expect(
    normalizeRenderOverride({
      multiplyColor: [2, -1, Number.NaN],
      opacity: 1.5,
      screenColor: [0.2, 0.4, 0.6],
    }),
  ).toEqual({multiplyColor: [1, 0, 0], opacity: 1, screenColor: [0.2, 0.4, 0.6]})
  expect(normalizeRenderOverride({})).toBeUndefined()
  expect(normalizeRenderOverride({culling: false})).toEqual({culling: false})
  const overrides = new Map<string, PuppetRenderOverride>()
  setRenderOverride(overrides, 'a', {opacity: 0.5})
  expect(overrides.get('a')).toEqual({opacity: 0.5})
  setRenderOverride(overrides, 'a', undefined)
  expect(overrides.has('a')).toBe(false)
})
