/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DEFAULT_P_DISPLAY_PREFERENCES,
  readPDisplayPreferences,
  writePDisplayPreferences,
} from '../index'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

const visiblePreferences = {dialogueComposerVisible: true} as const

beforeEach(() => {
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.unstubAllGlobals()
})

it('should default dialogue composer visibility to off when no valid setting exists', async () => {
  await expect(readPDisplayPreferences()).resolves.toEqual(DEFAULT_P_DISPLAY_PREFERENCES)

  localStorage.setItem('pomo:focus-room-display-preferences:v1', '{invalid')
  await expect(readPDisplayPreferences()).resolves.toEqual(DEFAULT_P_DISPLAY_PREFERENCES)
})

it('should persist and restore dialogue composer visibility on the web', async () => {
  await writePDisplayPreferences(visiblePreferences)

  await expect(readPDisplayPreferences()).resolves.toEqual(visiblePreferences)
  expect(localStorage.getItem('pomo:focus-room-display-preferences:v1')).toBe(
    JSON.stringify(visiblePreferences),
  )
})

it('should restore native preferences and rebuild the browser copy', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue(JSON.stringify(visiblePreferences))

  await expect(readPDisplayPreferences()).resolves.toEqual(visiblePreferences)
  expect(localStorage.getItem('pomo:focus-room-display-preferences:v1')).toBe(
    JSON.stringify(visiblePreferences),
  )
})

it('should use the default when native preferences are empty or unavailable', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('unavailable'))

  await expect(readPDisplayPreferences()).resolves.toEqual(DEFAULT_P_DISPLAY_PREFERENCES)
  await expect(readPDisplayPreferences()).resolves.toEqual(DEFAULT_P_DISPLAY_PREFERENCES)
})

it('should repair the native copy from authoritative browser preferences', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  localStorage.setItem('pomo:focus-room-display-preferences:v1', JSON.stringify(visiblePreferences))
  storageMocks.setItem.mockResolvedValue()

  await expect(readPDisplayPreferences()).resolves.toEqual(visiblePreferences)
  await vi.waitFor(() =>
    expect(storageMocks.setItem).toHaveBeenCalledWith(
      'pomo:focus-room-display-preferences:v1',
      JSON.stringify(visiblePreferences),
    ),
  )
})

it('should preserve a newer choice while native preferences are loading', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let completeRead: (value: string) => void = () => undefined
  storageMocks.getItem.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  storageMocks.setItem.mockResolvedValue()

  const pendingRead = readPDisplayPreferences()
  await writePDisplayPreferences(visiblePreferences)
  completeRead(JSON.stringify({dialogueComposerVisible: false}))

  await expect(pendingRead).resolves.toEqual(visiblePreferences)
})

it('should preserve native write order during rapid preference changes', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  const nativeWrites: string[] = []
  storageMocks.setItem.mockImplementation(async (_key, value) => {
    nativeWrites.push(value)
  })
  const hiddenPreferences = {dialogueComposerVisible: false} as const

  await Promise.all([
    writePDisplayPreferences(visiblePreferences),
    writePDisplayPreferences(hiddenPreferences),
  ])

  expect(nativeWrites).toEqual([
    JSON.stringify(visiblePreferences),
    JSON.stringify(hiddenPreferences),
  ])
})

it('should persist dialogue composer visibility to native storage', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.setItem.mockResolvedValue()

  await writePDisplayPreferences(visiblePreferences)

  expect(storageMocks.setItem).toHaveBeenCalledWith(
    'pomo:focus-room-display-preferences:v1',
    JSON.stringify(visiblePreferences),
  )
})
