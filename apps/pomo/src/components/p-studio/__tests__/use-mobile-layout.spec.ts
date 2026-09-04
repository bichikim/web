/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {useMobileLayout} from '../use-mobile-layout'

it('should observe the mobile layout breakpoint after mounting', () => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const mediaQuery = {
    addEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.add(listener)
    }),
    matches: true,
    removeEventListener: vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener)
    }),
  } as unknown as MediaQueryList
  const matchMedia = vi.fn(() => mediaQuery)
  vi.stubGlobal('matchMedia', matchMedia)
  const {cleanup, result} = renderHook(useMobileLayout)

  expect(matchMedia).toHaveBeenCalledWith('(width < 28rem)')
  expect(result()).toBe(true)

  listeners.forEach((listener) => listener({matches: false} as MediaQueryListEvent))
  expect(result()).toBe(false)

  cleanup()
  expect(mediaQuery.removeEventListener).toHaveBeenCalled()
  vi.unstubAllGlobals()
})
