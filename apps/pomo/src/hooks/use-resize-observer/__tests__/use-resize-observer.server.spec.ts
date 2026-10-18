/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {useResizeObserver} from '..'

// Exercise Solid's server lifecycle despite the shared runner's browser export conditions.
vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))

afterEach(() => vi.unstubAllGlobals())

it('should not access targets or construct observers during server rendering, even when started', () => {
  const target = vi.fn(() => null)
  const observer = vi.fn(() => {
    throw new Error('Server rendering must not construct ResizeObserver')
  })
  vi.stubGlobal('ResizeObserver', observer)
  createRoot((dispose) => {
    const result = useResizeObserver({onResize: vi.fn(), target})
    result.start()
    result.stop()
    dispose()
  })
  expect(target).not.toHaveBeenCalled()
  expect(observer).not.toHaveBeenCalled()
})
