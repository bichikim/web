/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {readAutoStartPreference, writeAutoStartPreference} from '../auto-start-storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-bridge', () => ({
  Storage: storageMocks,
}))

describe('auto-start-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.setItem.mockReset()
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'ReactNativeWebView')
  })

  it('should use browser storage outside the host app', async () => {
    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
    expect(localStorage.getItem('pomo:timer-auto-start:v1')).toBe('true')
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should use native storage when the host bridge is available', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue('true')
    storageMocks.setItem.mockResolvedValue()

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
    expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:timer-auto-start:v1', 'true')
    expect(localStorage.getItem('pomo:timer-auto-start:v1')).toBeNull()
  })

  it('should fall back to browser storage when native storage fails', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockRejectedValue(new Error('native storage unavailable'))
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
  })
})
