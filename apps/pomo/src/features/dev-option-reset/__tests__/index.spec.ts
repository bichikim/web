/** @vitest-environment jsdom */

import {cookieName, getLocale, localStorageKey, setLocale} from '@paraglide/runtime'
import {afterEach, expect, it, vi} from 'vitest'

import {
  createOptionResetManager,
  createRuntimeOptionResetManager,
  OPTION_RESET_GROUPS,
  type OptionResetStorage,
} from '../index'

const createStorage = (): OptionResetStorage => ({
  isNative: vi.fn(() => false),
  removeNative: vi.fn(async () => undefined),
  removeWeb: vi.fn(),
})

const createManager = (
  storage: OptionResetStorage,
  resetLocale = vi.fn(async () => undefined),
) => ({
  manager: createOptionResetManager({resetLocale, storage}),
  resetLocale,
})

afterEach(() => {
  document.cookie = `${cookieName}=; path=/; max-age=0`
  localStorage.clear()
  vi.restoreAllMocks()
})

it('should reset only the storage keys owned by one option group', async () => {
  const storage = createStorage()
  const {manager} = createManager(storage)

  await manager.reset('focus-room')

  expect(vi.mocked(storage.removeWeb).mock.calls.map(([key]) => key)).toEqual([
    'pomo:focus-room-scene-preferences:v1',
    'pomo:focus-room-scene-style:v1',
    'pomo:weather-preference:v2',
    'pomo:weather-preference:v1',
    'pomo:screen-saver-delay:v1',
  ])
  expect(storage.removeNative).not.toHaveBeenCalled()
})

it('should reset every option without deleting account or user-created data', async () => {
  const storage = createStorage()
  const {manager, resetLocale} = createManager(storage)

  await manager.resetAll()

  const removedKeys = vi.mocked(storage.removeWeb).mock.calls.map(([key]) => key)
  expect(new Set(removedKeys).size).toBe(removedKeys.length)
  expect(removedKeys).toHaveLength(
    OPTION_RESET_GROUPS.filter((group) => group.id !== 'language').reduce(
      (total, group) => total + group.storageKeyCount,
      0,
    ),
  )
  expect(resetLocale).toHaveBeenCalledOnce()
  expect(removedKeys).not.toContain('PARAGLIDE_LOCALE')
  expect(removedKeys).not.toContain('pomo:app-session:v1')
  expect(removedKeys).not.toContain('pomo:focus-room-feed-connections:v1')
  expect(removedKeys).not.toContain('pomo:focus-room-playlist:v1')
  expect(removedKeys).not.toContain('pomo:language-learning:sentences:v1')
  expect(removedKeys).not.toContain('pomo:language-learning:words:v1')
})

it('should remove native values before their browser copies', async () => {
  const storage = createStorage()
  vi.mocked(storage.isNative).mockReturnValue(true)
  const {manager} = createManager(storage)

  await manager.reset('updates')

  expect(storage.removeNative).toHaveBeenCalledWith('pomo:viewed-version-release:v1')
  expect(vi.mocked(storage.removeNative).mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(storage.removeWeb).mock.invocationCallOrder[0],
  )
})

it('should preserve browser copies when native reset fails', async () => {
  const storage = createStorage()
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.removeNative).mockRejectedValue(new Error('native unavailable'))
  const {manager} = createManager(storage)

  await expect(manager.reset('updates')).rejects.toThrow('Failed to reset Pomo options.')
  expect(storage.removeWeb).not.toHaveBeenCalled()
})

it('should delegate language reset to the locale feature', async () => {
  const storage = createStorage()
  const {manager, resetLocale} = createManager(storage)

  await manager.reset('language')

  expect(resetLocale).toHaveBeenCalledOnce()
  expect(storage.removeNative).not.toHaveBeenCalled()
  expect(storage.removeWeb).not.toHaveBeenCalled()
})

it('should report locale reset failures without claiming completion', async () => {
  const storage = createStorage()
  const resetLocale = vi.fn().mockRejectedValue(new Error('cookie unavailable'))
  const {manager} = createManager(storage, resetLocale)

  await expect(manager.reset('language')).rejects.toThrow('Failed to reset Pomo options.')
})

it('should remove the Paraglide cookie through the runtime manager', async () => {
  await setLocale('en', {reload: false})
  localStorage.setItem(localStorageKey, 'en')

  const manager = createRuntimeOptionResetManager()
  await manager.reset('language')

  expect(document.cookie).not.toContain(`${cookieName}=en`)
  expect(localStorage.getItem(localStorageKey)).toBe('en')
})

it('should remove the Paraglide cookie when every option is reset', async () => {
  await setLocale('en', {reload: false})
  localStorage.setItem(localStorageKey, 'en')
  localStorage.setItem('pomo:viewed-version-release:v1', '1.0.0')

  const manager = createRuntimeOptionResetManager()
  await manager.resetAll()

  expect(document.cookie).not.toContain(`${cookieName}=en`)
  expect(localStorage.getItem(localStorageKey)).toBe('en')
  expect(localStorage.getItem('pomo:viewed-version-release:v1')).toBeNull()
})

it('should use the preferred browser locale on the next web bootstrap after reset', async () => {
  vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['en-US'])
  await setLocale('ko', {reload: false})
  localStorage.setItem(localStorageKey, 'ko')

  const manager = createRuntimeOptionResetManager()
  await manager.reset('language')

  expect(document.cookie).not.toContain(`${cookieName}=ko`)
  expect(localStorage.getItem(localStorageKey)).toBe('ko')
  expect(getLocale()).toBe('en')
})
