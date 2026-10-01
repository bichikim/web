/** @vitest-environment jsdom */
import {fireEvent, renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {useRelaxDepthMotion} from '../components/p-relax-player-page/use-relax-depth-motion'

it('should clear gyroscope active status when reduced motion becomes preferred', async () => {
  let reduced = false
  const listeners = new Map<string, Set<() => void>>()
  const preference = {
    get matches() {
      return reduced
    },
    addEventListener: (type: string, listener: () => void) => {
      listeners.set(type, new Set([...(listeners.get(type) ?? []), listener]))
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener)
    },
  }

  vi.stubGlobal('matchMedia', () => preference)
  vi.stubGlobal('DeviceOrientationEvent', class {})

  const {cleanup, result} = renderHook(() => useRelaxDepthMotion())

  result.setInputMode('gyroscope')
  await vi.waitFor(() => expect(result.inputMode()).toBe('gyroscope'))

  fireEvent(
    globalThis.window,
    Object.assign(new Event('deviceorientation'), {beta: 10, gamma: 5}),
  )
  expect(result.status()).toBe('active')

  reduced = true
  for (const listener of listeners.get('change') ?? []) {
    listener()
  }

  expect(result.status()).not.toBe('active')

  cleanup()
  vi.unstubAllGlobals()
})
