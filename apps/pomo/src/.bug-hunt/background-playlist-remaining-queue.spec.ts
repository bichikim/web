/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {nextSlide} from '../features/background/playlist'

it('should advance to the next queued slide instead of rebuilding order from catalog ids', () => {
  expect(
    nextSlide({
      current: 'a',
      ids: ['a', 'b', 'c'],
      mode: 'sequential',
      remaining: ['c', 'b'],
      seen: ['a'],
    }).current,
  ).toBe('c')
})

it('should not reshuffle when continuing an in-progress random cycle', () => {
  const random = vi.spyOn(Math, 'random')

  nextSlide({
    current: 'a',
    ids: ['a', 'b', 'c', 'd'],
    mode: 'random',
    remaining: ['d', 'c', 'b'],
    seen: ['a'],
  })

  expect(random).not.toHaveBeenCalled()
})
