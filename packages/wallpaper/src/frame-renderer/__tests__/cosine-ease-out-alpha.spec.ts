import {expect, it} from 'vitest'

import {cosineEaseOutAlpha} from '../cosine-ease-out-alpha'

it('should fade from full opacity through halfway to zero', () => {
  expect(cosineEaseOutAlpha(0, 700)).toBe(1)
  expect(cosineEaseOutAlpha(350, 700)).toBeCloseTo(0.5)
  expect(cosineEaseOutAlpha(700, 700)).toBeCloseTo(0)
  expect(cosineEaseOutAlpha(1_400, 700)).toBeCloseTo(0)
})
