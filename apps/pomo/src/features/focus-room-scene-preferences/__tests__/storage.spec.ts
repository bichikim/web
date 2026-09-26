/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {readPScenePreferences, writePScenePreferences} from '../storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: storageMocks,
}))

const preferences = {
  activity: 'typing',
  gaze: 'user',
  timeMode: 'night',
} as const

describe('runtime scene preference persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    storageMocks.getItem.mockReset()
    storageMocks.setItem.mockReset()
  })

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'ReactNativeWebView')
    vi.unstubAllGlobals()
  })

  it('should use defaults when browser storage is empty or invalid', async () => {
    await expect(readPScenePreferences()).resolves.toEqual({
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    })

    localStorage.setItem('pomo:focus-room-scene-preferences:v1', '{invalid')
    await expect(readPScenePreferences()).resolves.toEqual({
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    })

    localStorage.setItem(
      'pomo:focus-room-scene-preferences:v1',
      JSON.stringify({...preferences, gaze: 'unknown'}),
    )
    await expect(readPScenePreferences()).resolves.toEqual({
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    })
  })

  it('should persist and restore all scene preferences on the web', async () => {
    await writePScenePreferences(preferences)

    await expect(readPScenePreferences()).resolves.toEqual(preferences)
    expect(localStorage.getItem('pomo:focus-room-scene-preferences:v1')).toBe(
      JSON.stringify(preferences),
    )
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should restore native preferences and rebuild the browser copy', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValue(JSON.stringify(preferences))

    await expect(readPScenePreferences()).resolves.toEqual(preferences)
    expect(localStorage.getItem('pomo:focus-room-scene-preferences:v1')).toBe(
      JSON.stringify(preferences),
    )
  })

  it('should use defaults when native preferences are empty or unavailable', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.getItem.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('unavailable'))

    await expect(readPScenePreferences()).resolves.toEqual({
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    })
    await expect(readPScenePreferences()).resolves.toEqual({
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    })
  })

  it('should recover browser preferences when a native read fails', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    let rejectRead: (error: Error) => void = () => undefined
    storageMocks.getItem.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectRead = reject
      }),
    )

    const pendingRead = readPScenePreferences()
    localStorage.setItem('pomo:focus-room-scene-preferences:v1', JSON.stringify(preferences))
    rejectRead(new Error('unavailable'))

    await expect(pendingRead).resolves.toEqual(preferences)
  })

  it('should replace a stale browser copy with native preferences', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    const stalePreferences = {
      activity: 'reading',
      gaze: 'focused',
      timeMode: 'day',
    } as const
    localStorage.setItem('pomo:focus-room-scene-preferences:v1', JSON.stringify(stalePreferences))
    storageMocks.getItem.mockResolvedValue(JSON.stringify(preferences))

    await expect(readPScenePreferences()).resolves.toEqual(preferences)
    expect(storageMocks.getItem).toHaveBeenCalledWith('pomo:focus-room-scene-preferences:v1')
    expect(storageMocks.setItem).not.toHaveBeenCalled()
    expect(localStorage.getItem('pomo:focus-room-scene-preferences:v1')).toBe(
      JSON.stringify(preferences),
    )
  })

  it('should preserve native write order during rapid preference changes', async () => {
    Object.defineProperty(globalThis, 'ReactNativeWebView', {configurable: true, value: {}})
    const nativeWrites: string[] = []
    storageMocks.setItem.mockImplementation(async (_key, value) => {
      nativeWrites.push(value)
    })
    const nextPreferences = {...preferences, activity: 'writing'} as const

    await Promise.all([
      writePScenePreferences(preferences),
      writePScenePreferences(nextPreferences),
    ])

    expect(nativeWrites).toEqual([JSON.stringify(preferences), JSON.stringify(nextPreferences)])
  })
})
