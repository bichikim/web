/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {readScreenSaverDelay, writeScreenSaverDelay} from '../storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: storageMocks,
}))

describe('screen-saver storage', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.setItem.mockReset()
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'ReactNativeWebView')
  })

  it('should default to ten minutes when no valid preference exists', async () => {
    expect(await readScreenSaverDelay()).toBe('10m')

    localStorage.setItem('pomo:screen-saver-delay:v1', '"invalid"')
    expect(await readScreenSaverDelay()).toBe('10m')
  })

  it('should persist the preference in browser storage outside the host app', async () => {
    await writeScreenSaverDelay('5s')

    expect(await readScreenSaverDelay()).toBe('5s')
    expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"5s"')
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should use native storage when the host bridge is available', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue('"1h"')
    storageMocks.setItem.mockResolvedValue()

    await writeScreenSaverDelay('1h')

    expect(await readScreenSaverDelay()).toBe('1h')
    expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:screen-saver-delay:v1', '"1h"')
    expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"1h"')
  })

  it('should preserve the latest browser preference when native storage is stale', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue('"10m"')
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await writeScreenSaverDelay('off')

    expect(await readScreenSaverDelay()).toBe('off')
  })

  it('should not let a pending native read overwrite a newer preference', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    let completeRead: (value: string) => void = () => undefined
    storageMocks.getItem.mockReturnValue(
      new Promise((resolve) => {
        completeRead = resolve
      }),
    )
    storageMocks.setItem.mockResolvedValue()

    const pendingRead = readScreenSaverDelay()
    await writeScreenSaverDelay('off')
    completeRead('"20m"')

    expect(await pendingRead).toBe('20m')
    expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"off"')
  })

  it('should preserve native write order during rapid preference changes', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    const nativeWrites: string[] = []
    storageMocks.setItem.mockImplementation(async (_key, value) => {
      nativeWrites.push(value)
    })

    await Promise.all([writeScreenSaverDelay('1m'), writeScreenSaverDelay('off')])

    expect(nativeWrites).toEqual(['"1m"', '"off"'])
  })

  it('should restore a native-only preference when browser storage is absent', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue('"20m"')

    expect(await readScreenSaverDelay()).toBe('20m')
    expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"20m"')
  })

  it('should use the default when native storage has no valid preference', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue('"invalid"')

    expect(await readScreenSaverDelay()).toBe('10m')
  })

  it('should use the default when native storage cannot be read', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockRejectedValue(new Error('native storage unavailable'))

    expect(await readScreenSaverDelay()).toBe('10m')
  })
})
