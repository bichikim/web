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
    vi.restoreAllMocks()
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

  it('should return the latest saved choice when a pending native read returns an older value', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    const completion = Promise.withResolvers<string | null>()
    const started = Promise.withResolvers<void>()
    storageMocks.getItem.mockImplementationOnce(() => {
      started.resolve()
      return completion.promise
    })
    storageMocks.setItem.mockResolvedValue()

    const read = readScreenSaverDelay()
    await started.promise
    await writeScreenSaverDelay('off')
    completion.resolve('"20m"')

    expect(await read).toBe('off')
    expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"off"')
    expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:screen-saver-delay:v1', '"off"')
  })

  it('should restore a native choice after a failed web write and module reload', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem('pomo:screen-saver-delay:v1', '"10m"')
    let stored = '"10m"'
    storageMocks.getItem.mockImplementation(async () => stored)
    storageMocks.setItem.mockImplementation(async (_key, value) => {
      stored = value
    })
    const webWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('storage full', 'QuotaExceededError')
    })

    await writeScreenSaverDelay('off')
    expect(stored).toBe('"off"')
    webWrite.mockRestore()
    vi.resetModules()
    const restored = await import('../storage')

    expect(await restored.readScreenSaverDelay()).toBe('off')
    expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"off"')
  })
})
