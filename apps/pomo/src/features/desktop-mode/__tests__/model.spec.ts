/** @vitest-environment jsdom */

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  DESKTOP_CLEAN_EXIT_STORAGE_KEY,
  DESKTOP_MODE_STORAGE_KEY,
  isDesktopBackgroundMode,
  isDesktopMode,
  readCleanExit,
  readDesktopMode,
  writeCleanExit,
  writeDesktopMode,
} from '../model'

beforeEach(() => localStorage.clear())

afterEach(() => vi.restoreAllMocks())

it('should validate every supported desktop mode', () => {
  expect(['normal', 'widget', 'desktop', 'interactiveDesktop'].every(isDesktopMode)).toBe(true)
  expect(isDesktopBackgroundMode('desktop')).toBe(true)
  expect(isDesktopBackgroundMode('interactiveDesktop')).toBe(true)
  expect(isDesktopBackgroundMode('normal')).toBe(false)
  expect(isDesktopMode('floating')).toBe(false)
  expect(isDesktopMode(null)).toBe(false)
})

it('should persist and restore desktop mode and clean-exit state', () => {
  expect(readDesktopMode()).toBe('normal')
  expect(readCleanExit()).toBe(false)

  writeDesktopMode('widget')
  writeCleanExit(true)

  expect(readDesktopMode()).toBe('widget')
  expect(readCleanExit()).toBe(true)
  expect(localStorage.getItem(DESKTOP_MODE_STORAGE_KEY)).toBe('widget')
  expect(localStorage.getItem(DESKTOP_CLEAN_EXIT_STORAGE_KEY)).toBe('true')

  localStorage.setItem(DESKTOP_MODE_STORAGE_KEY, 'invalid')
  writeCleanExit(false)
  expect(readDesktopMode()).toBe('normal')
  expect(readCleanExit()).toBe(false)
})

it('should fall back to normal recovery when storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('denied')
  })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('denied')
  })

  expect(readDesktopMode()).toBe('normal')
  expect(readCleanExit()).toBe(false)
  expect(() => writeDesktopMode('desktop')).not.toThrow()
  expect(() => writeCleanExit(true)).not.toThrow()
})
