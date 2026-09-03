/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {readDisplayThemePreference, writeDisplayThemePreference} from '../storage'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

const STORAGE_KEY = 'pomo:display-theme:v1'

beforeEach(() => {
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
})

it('should default invalid or missing web preferences to system', async () => {
  await expect(readDisplayThemePreference()).resolves.toBe('system')

  localStorage.setItem(STORAGE_KEY, '"unknown"')
  await expect(readDisplayThemePreference()).resolves.toBe('system')
})

it('should persist and restore a web preference', async () => {
  await writeDisplayThemePreference('bright')

  await expect(readDisplayThemePreference()).resolves.toBe('bright')
  expect(localStorage.getItem(STORAGE_KEY)).toBe('"bright"')
  expect(storageMocks.setItem).not.toHaveBeenCalled()
})

it('should restore a native preference and rebuild the browser copy', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue('"dark"')

  await expect(readDisplayThemePreference()).resolves.toBe('dark')
  expect(localStorage.getItem(STORAGE_KEY)).toBe('"dark"')
})

it('should repair native storage from an existing browser preference', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  localStorage.setItem(STORAGE_KEY, '"bright"')
  storageMocks.setItem.mockResolvedValue()

  await expect(readDisplayThemePreference()).resolves.toBe('bright')
  await vi.waitFor(() => expect(storageMocks.setItem).toHaveBeenCalledWith(STORAGE_KEY, '"bright"'))
})

it('should default when native storage is empty invalid or unavailable', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce('"unknown"')
    .mockRejectedValueOnce(new Error('unavailable'))

  await expect(readDisplayThemePreference()).resolves.toBe('system')
  await expect(readDisplayThemePreference()).resolves.toBe('system')
  await expect(readDisplayThemePreference()).resolves.toBe('system')
})

it('should mirror the newest preference to native storage in order', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  const writes: string[] = []
  storageMocks.setItem.mockImplementation(async (_key, value) => {
    writes.push(value)
  })

  await Promise.all([writeDisplayThemePreference('dark'), writeDisplayThemePreference('system')])

  expect(writes).toEqual(['"dark"', '"system"'])
  expect(localStorage.getItem(STORAGE_KEY)).toBe('"system"')
})

it('should keep a newer browser choice when a native read completes late', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let completeRead: (value: string) => void = () => undefined
  storageMocks.getItem.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  storageMocks.setItem.mockResolvedValue()

  const pendingRead = readDisplayThemePreference()
  await writeDisplayThemePreference('bright')
  completeRead('"dark"')

  await expect(pendingRead).resolves.toBe('bright')
})

it('should recover the default when a newer choice becomes unreadable', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let completeRead: (value: string) => void = () => undefined
  storageMocks.getItem.mockReturnValue(
    new Promise((resolve) => {
      completeRead = resolve
    }),
  )
  storageMocks.setItem.mockResolvedValue()

  const pendingRead = readDisplayThemePreference()
  await writeDisplayThemePreference('dark')
  localStorage.clear()
  completeRead('"bright"')

  await expect(pendingRead).resolves.toBe('system')
})
