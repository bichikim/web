/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

import {nextSlide} from '../features/background/playlist'

afterEach(() => vi.restoreAllMocks())

it('should not return an undefined slide id when Math.random() returns 1', () => {
  vi.spyOn(Math, 'random').mockReturnValue(1)

  const slide = nextSlide({
    current: null,
    ids: ['a', 'b'],
    mode: 'random',
    remaining: [],
  })

  expect(slide.current).not.toBeUndefined()
  expect(slide.remaining.every((id) => id !== undefined)).toBe(true)
  expect(['a', 'b']).toContain(slide.current)
})
