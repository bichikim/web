/** @vitest-environment jsdom */

import {cookieName, getLocale, localStorageKey, setLocale} from '@paraglide/runtime'
import {afterEach, expect, it, vi} from 'vitest'

import {
  createOptionResetManager,
  createRuntimeOptionResetManager,
  OPTION_RESET_GROUPS,
  type OptionResetStorage,
} from '../index'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  removeItem: vi.fn<(key: string) => Promise<void>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

afterEach(() => {
  document.cookie = `${cookieName}=; path=/; max-age=0`
  localStorage.clear()
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  storageMocks.getItem.mockReset()
  storageMocks.removeItem.mockReset()
  storageMocks.setItem.mockReset()
  vi.restoreAllMocks()
})

const createStorage = (): OptionResetStorage => ({
  getNative: vi.fn(async () => null),
  isNative: vi.fn(() => false),
  removeNative: vi.fn(async () => undefined),
  removeWeb: vi.fn(),
  setNative: vi.fn(async () => undefined),
  setWeb: vi.fn(),
})

const createManager = (
  storage: OptionResetStorage,
  resetLocale = vi.fn(async () => undefined),
) => ({
  manager: createOptionResetManager({resetLocale, storage}),
  resetLocale,
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

it('should restore native values when a middle deletion fails', async () => {
  const storage = createStorage()
  const nativeValues = new Map<string, string>()
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.getNative).mockImplementation(async (key) => nativeValues.get(key) ?? null)
  vi.mocked(storage.removeNative).mockImplementation(async (key) => {
    nativeValues.delete(key)
    if (key === 'pomo:weather-preference:v2') {
      throw new Error('native unavailable')
    }
  })
  vi.mocked(storage.setNative).mockImplementation(async (key, value) => {
    nativeValues.set(key, value)
  })
  for (const groupKey of [
    'pomo:focus-room-scene-preferences:v1',
    'pomo:focus-room-scene-style:v1',
    'pomo:weather-preference:v2',
    'pomo:weather-preference:v1',
    'pomo:screen-saver-delay:v1',
  ]) {
    nativeValues.set(groupKey, `${groupKey}:value`)
  }
  const originalValues = new Map(nativeValues)
  const {manager} = createManager(storage)

  await expect(manager.reset('focus-room')).rejects.toThrow('Failed to reset Pomo options.')

  expect(nativeValues).toEqual(originalValues)
  expect(storage.setNative).toHaveBeenCalledTimes(3)
  expect(storage.removeWeb).not.toHaveBeenCalled()
  expect(storage.setWeb).not.toHaveBeenCalled()
})

it('should restore native values when the last deletion fails', async () => {
  const storage = createStorage()
  const nativeValues = new Map<string, string>()
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.getNative).mockImplementation(async (key) => nativeValues.get(key) ?? null)
  vi.mocked(storage.removeNative).mockImplementation(async (key) => {
    nativeValues.delete(key)
    if (key === 'pomo:screen-saver-delay:v1') {
      throw new Error('native unavailable')
    }
  })
  vi.mocked(storage.setNative).mockImplementation(async (key, value) => {
    nativeValues.set(key, value)
  })
  for (const groupKey of [
    'pomo:focus-room-scene-preferences:v1',
    'pomo:focus-room-scene-style:v1',
    'pomo:weather-preference:v2',
    'pomo:weather-preference:v1',
    'pomo:screen-saver-delay:v1',
  ]) {
    nativeValues.set(groupKey, `${groupKey}:value`)
  }
  const originalValues = new Map(nativeValues)
  const {manager} = createManager(storage)

  await expect(manager.reset('focus-room')).rejects.toThrow('Failed to reset Pomo options.')

  expect(nativeValues).toEqual(originalValues)
  expect(storage.setNative).toHaveBeenCalledTimes(5)
  expect(storage.removeWeb).not.toHaveBeenCalled()
  expect(storage.setWeb).not.toHaveBeenCalled()
})

it('should converge web values and report a partial reset when restoration fails', async () => {
  const storage = createStorage()
  const nativeValues = new Map<string, string>()
  const firstKey = 'pomo:focus-room-scene-preferences:v1'
  const failedKey = 'pomo:weather-preference:v2'
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.getNative).mockImplementation(async (key) => nativeValues.get(key) ?? null)
  vi.mocked(storage.removeNative).mockImplementation(async (key) => {
    nativeValues.delete(key)
    if (key === failedKey) {
      throw new Error('native unavailable')
    }
  })
  vi.mocked(storage.setNative).mockImplementation(async (key, value) => {
    if (key === firstKey) {
      throw new Error('native restoration unavailable')
    }

    nativeValues.set(key, value)
  })
  for (const groupKey of [
    firstKey,
    'pomo:focus-room-scene-style:v1',
    failedKey,
    'pomo:weather-preference:v1',
    'pomo:screen-saver-delay:v1',
  ]) {
    nativeValues.set(groupKey, `${groupKey}:value`)
  }
  const {manager} = createManager(storage)

  await expect(manager.reset('focus-room')).resolves.toEqual({
    preservedCount: 4,
    resetCount: 1,
    status: 'partial',
    unresolvedCount: 0,
  })
  expect(storage.removeWeb).toHaveBeenCalledWith(firstKey)
  expect(storage.setWeb).toHaveBeenCalledTimes(4)
  expect(storage.setWeb).toHaveBeenCalledWith(failedKey, `${failedKey}:value`)
})

it('should report an unresolved web value without hiding completed native deletions', async () => {
  const storage = createStorage()
  const unresolvedKey = 'pomo:weather-preference:v2'
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.removeWeb).mockImplementation((key) => {
    if (key === unresolvedKey) {
      throw new Error('web unavailable')
    }
  })
  const {manager} = createManager(storage)

  await expect(manager.reset('focus-room')).resolves.toEqual({
    preservedCount: 0,
    resetCount: 4,
    status: 'partial',
    unresolvedCount: 1,
  })
})

it('should preserve readable recovery results when one native verification fails', async () => {
  const storage = createStorage()
  const nativeValues = new Map<string, string>()
  const firstKey = 'pomo:focus-room-scene-preferences:v1'
  const unreadableKey = 'pomo:weather-preference:v2'
  let isRecovering = false
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.getNative).mockImplementation(async (key) => {
    if (isRecovering && key === unreadableKey) {
      throw new Error('native read unavailable')
    }

    return nativeValues.get(key) ?? null
  })
  vi.mocked(storage.removeNative).mockImplementation(async (key) => {
    nativeValues.delete(key)
    if (key === unreadableKey) {
      throw new Error('native unavailable')
    }
  })
  vi.mocked(storage.setNative).mockImplementation(async (key, value) => {
    if (key === firstKey) {
      isRecovering = true
      throw new Error('native restoration unavailable')
    }

    nativeValues.set(key, value)
  })
  for (const groupKey of [
    firstKey,
    'pomo:focus-room-scene-style:v1',
    unreadableKey,
    'pomo:weather-preference:v1',
    'pomo:screen-saver-delay:v1',
  ]) {
    nativeValues.set(groupKey, `${groupKey}:value`)
  }
  const {manager} = createManager(storage)

  await expect(manager.reset('focus-room')).resolves.toEqual({
    preservedCount: 3,
    resetCount: 1,
    status: 'partial',
    unresolvedCount: 1,
  })
  expect(storage.removeWeb).toHaveBeenCalledWith(firstKey)
  expect(storage.setWeb).toHaveBeenCalledTimes(3)
})

it('should report a partial reset when locale cleanup fails after other options reset', async () => {
  const storage = createStorage()
  const resetLocale = vi.fn().mockRejectedValue(new Error('cookie unavailable'))
  const {manager} = createManager(storage, resetLocale)

  const result = await manager.resetAll()
  const languageStorageCount = OPTION_RESET_GROUPS.find(
    (group) => group.id === 'language',
  )?.storageKeyCount

  expect(result).toMatchObject({
    preservedCount: 0,
    status: 'partial',
    unresolvedCount: languageStorageCount,
  })
  if (result.status === 'partial') {
    expect(result.resetCount).toBe(
      OPTION_RESET_GROUPS.filter((group) => group.id !== 'language').reduce(
        (total, group) => total + group.storageKeyCount,
        0,
      ),
    )
  }
})

it('should report language as preserved when reset all stops after a partial storage reset', async () => {
  const storage = createStorage()
  const unresolvedKey = 'pomo:weather-preference:v2'
  vi.mocked(storage.isNative).mockReturnValue(true)
  vi.mocked(storage.removeWeb).mockImplementation((key) => {
    if (key === unresolvedKey) {
      throw new Error('web unavailable')
    }
  })
  const {manager, resetLocale} = createManager(storage)

  const result = await manager.resetAll()
  const languageStorageCount = OPTION_RESET_GROUPS.find(
    (group) => group.id === 'language',
  )?.storageKeyCount

  expect(result).toMatchObject({
    preservedCount: languageStorageCount,
    status: 'partial',
    unresolvedCount: 1,
  })
  expect(resetLocale).not.toHaveBeenCalled()
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

it('should converge runtime web storage with native values after restoration fails', async () => {
  const nativeValues = new Map<string, string>()
  const firstKey = 'pomo:focus-room-scene-preferences:v1'
  const failedKey = 'pomo:weather-preference:v2'
  const groupKeys = [
    firstKey,
    'pomo:focus-room-scene-style:v1',
    failedKey,
    'pomo:weather-preference:v1',
    'pomo:screen-saver-delay:v1',
  ]
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  for (const groupKey of groupKeys) {
    nativeValues.set(groupKey, `${groupKey}:native`)
    localStorage.setItem(groupKey, `${groupKey}:web`)
  }
  storageMocks.getItem.mockImplementation(async (key) => nativeValues.get(key) ?? null)
  storageMocks.removeItem.mockImplementation(async (key) => {
    nativeValues.delete(key)
    if (key === failedKey) {
      throw new Error('native unavailable')
    }
  })
  storageMocks.setItem.mockImplementation(async (key, value) => {
    if (key === firstKey) {
      throw new Error('native restoration unavailable')
    }

    nativeValues.set(key, value)
  })

  await expect(createRuntimeOptionResetManager().reset('focus-room')).resolves.toEqual({
    preservedCount: groupKeys.length - 1,
    resetCount: 1,
    status: 'partial',
    unresolvedCount: 0,
  })
  expect(localStorage.getItem(firstKey)).toBeNull()
  expect(localStorage.getItem(failedKey)).toBe(`${failedKey}:native`)
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
