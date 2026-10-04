/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {useMediaQuery} from '../hooks/use-media-query'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should read MediaQueryList.matches when a change event omits matches', () => {
  const target = new EventTarget()
  const mediaQuery = Object.assign(target, {
    matches: true,
    media: '(prefers-color-scheme: dark)',
  })
  vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))

  const {result} = renderHook(() => useMediaQuery('(prefers-color-scheme: dark)'))
  expect(result()).toBe(true)

  Object.assign(mediaQuery, {matches: false})
  target.dispatchEvent(new Event('change'))

  expect(result()).toBe(false)
})
