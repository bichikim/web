/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {useScreenSaver} from '../use-screen-saver'

const native = vi.hoisted(() => ({getItem: vi.fn(), setItem: vi.fn()}))
vi.mock('@apps-in-toss/web-framework', () => ({Storage: native}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  localStorage.clear()
  Reflect.deleteProperty(window, 'ReactNativeWebView')
})

it.each(['pending', 'completed'] as const)(
  'should restore the disabled screen saver on remount with native persistence %s',
  async (phase) => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem('pomo:screen-saver-delay:v1', '"10m"')
    let stored = '"10m"'
    const completion = Promise.withResolvers<void>()
    native.getItem.mockImplementation(async () => stored)
    native.setItem.mockImplementation(async (_key: string, value: string) => {
      await completion.promise
      stored = value
    })
    const first = renderHook(() => useScreenSaver())
    await vi.waitFor(() => expect(first.result.delay()).toBe('10m'))
    const webWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('storage full', 'QuotaExceededError')
    })

    first.result.onDelayChange('off')
    await vi.waitFor(() => expect(native.setItem).toHaveBeenCalled())
    if (phase === 'completed') {
      completion.resolve()
      await vi.waitFor(() => expect(stored).toBe('"off"'))
    }
    expect(first.result.delay()).toBe('off')
    first.cleanup()
    webWrite.mockRestore()
    const restored = renderHook(() => useScreenSaver())
    completion.resolve()

    await vi.waitFor(() => expect(native.getItem).toHaveBeenCalled())
    await vi.waitFor(() => {
      expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"off"')
      expect(restored.result.delay()).toBe('off')
    })
  },
)
