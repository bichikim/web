/** @vitest-environment node */

import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useImageSupport} from '../use-support'

vi.mock('solid-js', () => vi.importActual<typeof import('solid-js')>('solid-js/dist/server.js'))

afterEach(() => vi.unstubAllGlobals())

it('should retain the initial false state during SSR without probing or notifying', () => {
  const requestAdapter = vi.fn()
  const onStatus = vi.fn()
  vi.stubGlobal('navigator', {gpu: {requestAdapter}})
  createRoot((dispose) => {
    const supported = useImageSupport({onStatus})
    expect(supported()).toBe(false)
    dispose()
  })
  expect(requestAdapter).not.toHaveBeenCalled()
  expect(onStatus).not.toHaveBeenCalled()
})
