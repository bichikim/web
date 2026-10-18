/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {useMediaQuery} from '..'

// The shared Vitest config selects browser exports, so exercise Solid's actual server lifecycle here.
vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))

afterEach(() => vi.unstubAllGlobals())

it.each([false, true])('should retain initialValue=%s during server rendering', (initialValue) => {
  const matchMedia = vi.fn(() => {
    throw new Error('Server rendering must not access matchMedia')
  })
  vi.stubGlobal('matchMedia', matchMedia)

  const result = createRoot((dispose) => {
    const matches = useMediaQuery('(prefers-color-scheme: dark)', {initialValue})
    const value = matches()
    dispose()
    return value
  })

  expect(result).toBe(initialValue)
  expect(matchMedia).not.toHaveBeenCalled()
})

it('should return the default value without browser globals on the server', () => {
  expect(typeof globalThis.window).toBe('undefined')
  expect(typeof globalThis.matchMedia).toBe('undefined')

  const result = createRoot((dispose) => {
    const matches = useMediaQuery('(width < 28rem)')
    const value = matches()
    dispose()
    return value
  })

  expect(result).toBe(false)
})
