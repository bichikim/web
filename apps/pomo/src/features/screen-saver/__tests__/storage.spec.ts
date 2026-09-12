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

  it('should preserve the latest browser preference when native storage is stale', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue('"10m"')
    storageMocks.setItem.mockRejectedValue(new Error('native storage unavailable'))

    await writeScreenSaverDelay('off')

    expect(await readScreenSaverDelay()).toBe('off')
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

  it('should wait for a pending native-only write before restoring the preference', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem('pomo:screen-saver-delay:v1', '"10m"')
    let stored = '"10m"'
    const completion = Promise.withResolvers<void>()
    storageMocks.getItem.mockImplementation(async () => stored)
    storageMocks.setItem.mockImplementation(async (_key, value) => {
      await completion.promise
      stored = value
    })
    const webWrite = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('web unavailable')
    })
    const pendingWrite = writeScreenSaverDelay('off')

    await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalled())
    webWrite.mockRestore()
    const pendingRead = readScreenSaverDelay()
    completion.resolve()
    await pendingWrite

    expect(await pendingRead).toBe('off')
    expect(await readScreenSaverDelay()).toBe('off')
  })

  it('should reject when browser persistence fails outside the host app', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('web unavailable')
    })

    await expect(writeScreenSaverDelay('off')).rejects.toThrow(
      'Failed to persist screen saver delay.',
    )
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should reject when both stores fail to persist the preference', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('web unavailable')
    })
    storageMocks.setItem.mockRejectedValue(new Error('native unavailable'))

    await expect(writeScreenSaverDelay('off')).rejects.toThrow(
      'Failed to persist screen saver delay.',
    )
  })

  it('should preserve the previous web-only preference when both later writes fail', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue('"10m"')
    storageMocks.setItem.mockRejectedValue(new Error('native unavailable'))
    await writeScreenSaverDelay('off')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('web unavailable')
    })

    await expect(writeScreenSaverDelay('1m')).rejects.toThrow(
      'Failed to persist screen saver delay.',
    )

    expect(await readScreenSaverDelay()).toBe('off')
    expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"off"')
    vi.restoreAllMocks()
    storageMocks.setItem.mockResolvedValue()
    await writeScreenSaverDelay('1h')
    expect(await readScreenSaverDelay()).toBe('1h')
  })

  it('should reject when a successful native write cannot invalidate the stale web copy', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem('pomo:screen-saver-delay:v1', '"10m"')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('web unavailable')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('removal unavailable')
    })

    await expect(writeScreenSaverDelay('off')).rejects.toThrow(
      'Failed to persist screen saver delay.',
    )
    expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:screen-saver-delay:v1', '"off"')
    expect(await readScreenSaverDelay()).toBe('10m')
  })

  it.each(['value', 'missing', 'error'] as const)(
    'should retry a pending native read returning %s after a newer preference is saved',
    async (outcome) => {
      Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
      const completion = Promise.withResolvers<string | null>()
      storageMocks.getItem.mockReturnValue(completion.promise)
      storageMocks.setItem.mockResolvedValue()

      const pendingRead = readScreenSaverDelay()
      await vi.waitFor(() => expect(storageMocks.getItem).toHaveBeenCalled())
      await writeScreenSaverDelay('off')
      switch (outcome) {
        case 'value':
          completion.resolve('"20m"')
          break
        case 'missing':
          completion.resolve(null)
          break
        case 'error':
          completion.reject(new Error('native unavailable'))
          break
      }

      expect(await pendingRead).toBe('off')
      expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe('"off"')
    },
  )

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
