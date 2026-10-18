/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {createRuntimeProfile} from '../../tracking/create-runtime-profile'
import type {RuntimeProfile} from '../../tracking/types'
import {useLocalInputs} from '../use-local-inputs'
afterEach(() => vi.unstubAllGlobals())
test('should smooth local input changes on animation frames and stop scheduling once settled', () => {
  const callbacks = new Map<number, FrameRequestCallback>()
  let identifier = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    identifier += 1
    callbacks.set(identifier, callback)
    return identifier
  })
  vi.stubGlobal('cancelAnimationFrame', (frame: number) => callbacks.delete(frame))
  const advance = (timestamp: number) => {
    const pending = [...callbacks.values()]
    callbacks.clear()
    pending.forEach((callback) => callback(timestamp))
  }
  const document = createDemoDocument()
  const [profile, setProfile] = createSignal<RuntimeProfile>({
    ...createRuntimeProfile(document),
    mappings: [
      {
        enabled: true,
        input: 'manualValue',
        inputMaximum: 1,
        inputMinimum: 0,
        multiplier: 2,
        outputMaximum: 1,
        outputMinimum: 0,
        parameterId: 'manual',
        smoothing: 0.1,
      },
    ],
  })
  const {result} = renderHook(() =>
    useLocalInputs({document: () => document, profile, updateProfile: setProfile}),
  )
  advance(0)
  expect(result.localValues().manual).toBe(0)
  result.setInputValue('manualValue', 0.5)
  advance(0)
  advance(100)
  expect(result.localValues().manual).toBeCloseTo(1 - Math.exp(-1))
  advance(1000)
  expect(result.localValues().manual).toBe(1)
  expect(callbacks.size).toBe(0)
})
