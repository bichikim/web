/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {readAutoStartPreference, writeAutoStartPreference} from '../auto-start-storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: storageMocks,
}))

describe('auto-start-storage', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.setItem.mockReset()
    vi.spyOn(Date, 'now').mockReturnValue(20)
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'ReactNativeWebView')
    vi.restoreAllMocks()
  })

  it('should use browser storage outside the host app', async () => {
    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
    expect(JSON.parse(localStorage.getItem('pomo:timer-auto-start:v2') ?? '')).toEqual({
      isEnabled: true,
      savedAt: 20,
    })
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should read the legacy browser preference', async () => {
    localStorage.setItem('pomo:timer-auto-start:v1', 'true')

    expect(await readAutoStartPreference()).toBe(true)
  })

  it('should read the legacy native preference', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockImplementation(async (key) =>
      key === 'pomo:timer-auto-start:v1' ? 'true' : null,
    )

    expect(await readAutoStartPreference()).toBe(true)
    expect(storageMocks.getItem).toHaveBeenNthCalledWith(1, 'pomo:timer-auto-start:v2')
    expect(storageMocks.getItem).toHaveBeenNthCalledWith(2, 'pomo:timer-auto-start:v1')
  })

  it('should ignore malformed browser preferences', async () => {
    localStorage.setItem('pomo:timer-auto-start:v2', '{invalid')

    expect(await readAutoStartPreference()).toBe(false)
  })

  it('should ignore browser values that do not match current or legacy schemas', async () => {
    localStorage.setItem('pomo:timer-auto-start:v2', JSON.stringify({isEnabled: 'yes', savedAt: 1}))
    localStorage.setItem('pomo:timer-auto-start:v1', JSON.stringify('yes'))

    expect(await readAutoStartPreference()).toBe(false)
  })

  it('should mirror the latest preference to native storage', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(JSON.stringify({isEnabled: true, savedAt: 20}))
    storageMocks.setItem.mockResolvedValue()

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
    const [storageKey, storedValue] = storageMocks.setItem.mock.calls[0] ?? []
    expect(storageKey).toBe('pomo:timer-auto-start:v2')
    expect(JSON.parse(storedValue ?? '')).toEqual({isEnabled: true, savedAt: 20})
  })

  it('should fall back to browser storage when native storage is empty', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(null)
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
  })

  it('should fall back to browser storage when native storage fails', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockRejectedValue(new Error('native storage unavailable'))
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
  })

  it('should use the disabled default when native storage is empty or fails', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(null)
    expect(await readAutoStartPreference()).toBe(false)

    storageMocks.getItem.mockRejectedValue(new Error('native storage unavailable'))
    expect(await readAutoStartPreference()).toBe(false)
  })

  it('should select a newer browser value when the native copy is stale', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockImplementation(async (key) =>
      key === 'pomo:timer-auto-start:v1' ? 'false' : null,
    )
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await writeAutoStartPreference(true)

    expect(await readAutoStartPreference()).toBe(true)
  })

  it('should select a newer native value', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(
      'pomo:timer-auto-start:v2',
      JSON.stringify({isEnabled: false, savedAt: 10}),
    )
    storageMocks.getItem.mockResolvedValue(JSON.stringify({isEnabled: true, savedAt: 15}))

    expect(await readAutoStartPreference()).toBe(true)
  })

  it('should converge native storage after older writes finish last', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    const completions: Array<() => void> = []
    storageMocks.setItem.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          completions.push(resolve)
        }),
    )

    const firstWrite = writeAutoStartPreference(true)
    const secondWrite = writeAutoStartPreference(false)
    await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledTimes(2))

    completions[1]?.()
    await secondWrite
    completions[0]?.()
    await vi.waitFor(() => {
      expect(storageMocks.setItem).toHaveBeenCalledTimes(3)
    })
    const repairedValue = storageMocks.setItem.mock.calls[2]?.[1]
    expect(JSON.parse(repairedValue ?? '')).toMatchObject({isEnabled: false})
    completions[2]?.()
    await firstWrite
  })
})
