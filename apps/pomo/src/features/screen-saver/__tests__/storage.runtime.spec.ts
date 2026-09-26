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
    Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
  })

  it('should default to ten minutes when no valid preference exists', async () => {
    expect(await readScreenSaverDelay()).toBe('10m')

    localStorage.setItem('pomo:screen-saver-delay:v1', '"invalid"')
    expect(await readScreenSaverDelay()).toBe('10m')
  })

  it('should persist the preference in browser storage outside the host app', async () => {
    await writeScreenSaverDelay('5s')

    expect(await readScreenSaverDelay()).toBe('5s')
    expect(JSON.parse(localStorage.getItem('pomo:screen-saver-delay:v1') ?? '')).toMatchObject({
      delay: '5s',
      savedAt: expect.any(Number),
    })
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should use native storage when the host bridge is available', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    let nativeValue = '"1h"'
    storageMocks.getItem.mockImplementation(async () => nativeValue)
    storageMocks.setItem.mockImplementation(async (_key, value) => {
      nativeValue = value
    })

    await writeScreenSaverDelay('1h')

    expect(await readScreenSaverDelay()).toBe('1h')
    expect(JSON.parse(nativeValue)).toMatchObject({delay: '1h', savedAt: expect.any(Number)})
    expect(JSON.parse(localStorage.getItem('pomo:screen-saver-delay:v1') ?? '')).toMatchObject({
      delay: '1h',
      savedAt: expect.any(Number),
    })
  })

  it('should restore newer native storage over a stale browser cache', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem('pomo:screen-saver-delay:v1', JSON.stringify({delay: 'off', savedAt: 10}))
    storageMocks.getItem.mockResolvedValue(JSON.stringify({delay: '1h', savedAt: 20}))

    expect(await readScreenSaverDelay()).toBe('1h')
    expect(localStorage.getItem('pomo:screen-saver-delay:v1')).toBe(
      JSON.stringify({delay: '1h', savedAt: 20}),
    )
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should restore a repaired native choice after web storage is cleared', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem('pomo:screen-saver-delay:v1', JSON.stringify({delay: 'off', savedAt: 20}))
    let stored = '"10m"'
    storageMocks.getItem.mockImplementation(async () => stored)
    storageMocks.setItem.mockImplementation(async (_key, value) => {
      stored = value
    })

    expect(await readScreenSaverDelay()).toBe('off')
    localStorage.clear()
    expect(await readScreenSaverDelay()).toBe('off')
    expect(JSON.parse(stored)).toMatchObject({delay: 'off', savedAt: 20})
    expect(JSON.parse(localStorage.getItem('pomo:screen-saver-delay:v1') ?? '')).toMatchObject({
      delay: 'off',
      savedAt: 20,
    })
  })

  it('should restore a native choice after a failed web write and module reload', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
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
    expect(JSON.parse(stored)).toMatchObject({delay: 'off', savedAt: expect.any(Number)})
    webWrite.mockRestore()
    vi.resetModules()
    const restored = await import('../storage')

    expect(await restored.readScreenSaverDelay()).toBe('off')
    expect(JSON.parse(localStorage.getItem('pomo:screen-saver-delay:v1') ?? '')).toMatchObject({
      delay: 'off',
      savedAt: expect.any(Number),
    })
  })
})
