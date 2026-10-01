/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {useRelaxDepthMotion} from '../components/p-relax-player-page/use-relax-depth-motion'

it('should not leave gyroscope depth input waiting when reduced motion is preferred', async () => {
  const listeners = new Map<string, Set<() => void>>()
  const preference = {
    addEventListener: (type: string, listener: () => void) => {
      listeners.set(type, new Set([...(listeners.get(type) ?? []), listener]))
    },
    matches: true,
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener)
    },
  }

  vi.stubGlobal('matchMedia', (query: string) => {
    expect(query).toBe('(prefers-reduced-motion: reduce)')
    return preference
  })
  vi.stubGlobal('DeviceOrientationEvent', class {})

  const {cleanup, result} = renderHook(() => useRelaxDepthMotion())

  expect(result.inputMode()).toBe('drag')
  expect(result.status()).toBe('ready')

  result.setInputMode('gyroscope')

  await vi.waitFor(() => expect(result.inputMode()).toBe('gyroscope'))
  expect(result.status()).not.toBe('waiting')

  cleanup()
  vi.unstubAllGlobals()
})
