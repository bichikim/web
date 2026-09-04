/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createPDisplayPreferencesRepository,
  DEFAULT_P_DISPLAY_PREFERENCES,
  type PDisplayPreferencesStorage,
  readPDisplayPreferences,
  writePDisplayPreferences,
} from '../index'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

const visiblePreferences = {dialogueComposerVisible: true} as const
const STORAGE_KEY = 'pomo:focus-room-display-preferences:v1'

const createStorageHarness = () => {
  const nativeValues = new Map<string, unknown>()
  const webValues = new Map<string, unknown>()
  const storage = {
    isNative: vi.fn(() => false),
    readNative: vi.fn<(key: string) => Promise<unknown | null>>(async (key) => {
      return nativeValues.get(key) ?? null
    }),
    readWeb: vi.fn<(key: string) => unknown | null>((key) => webValues.get(key) ?? null),
    writeNative: vi.fn(async (key: string, value: unknown) => {
      nativeValues.set(key, value)
    }),
    writeWeb: vi.fn((key: string, value: unknown) => {
      webValues.set(key, value)
    }),
  } satisfies PDisplayPreferencesStorage

  return {
    nativeValues,
    repository: createPDisplayPreferencesRepository({storage}),
    storage,
    webValues,
  }
}

beforeEach(() => {
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
  vi.unstubAllGlobals()
})

describe('focus-room display preference repository', () => {
  it('should reject a browser save when browser storage fails', async () => {
    const {repository, storage} = createStorageHarness()
    storage.writeWeb.mockImplementation(() => {
      throw new Error('browser unavailable')
    })

    await expect(repository.write(visiblePreferences)).rejects.toThrow(
      'Failed to persist focus-room display preferences.',
    )
  })

  it('should persist through native storage when the browser cache is unavailable', async () => {
    const {nativeValues, repository, storage} = createStorageHarness()
    storage.isNative.mockReturnValue(true)
    storage.writeWeb.mockImplementation(() => {
      throw new Error('browser unavailable')
    })

    await expect(repository.write(visiblePreferences)).resolves.toBeUndefined()
    expect(nativeValues.get(STORAGE_KEY)).toEqual(visiblePreferences)
  })

  it('should continue native writes after an earlier write fails', async () => {
    const {nativeValues, repository, storage} = createStorageHarness()
    storage.isNative.mockReturnValue(true)
    storage.writeNative
      .mockRejectedValueOnce(new Error('native unavailable'))
      .mockImplementationOnce(async (key, value) => {
        nativeValues.set(key, value)
      })

    await expect(repository.write(DEFAULT_P_DISPLAY_PREFERENCES)).rejects.toThrow(
      'Failed to persist focus-room display preferences.',
    )
    await expect(repository.write(visiblePreferences)).resolves.toBeUndefined()
    expect(nativeValues.get(STORAGE_KEY)).toEqual(visiblePreferences)
  })

  it('should wait for an active native write before reading the preferences', async () => {
    const {nativeValues, repository, storage} = createStorageHarness()
    storage.isNative.mockReturnValue(true)
    nativeValues.set(STORAGE_KEY, DEFAULT_P_DISPLAY_PREFERENCES)
    let completeWrite: () => void = () => undefined
    storage.writeNative.mockImplementation(
      (key, value) =>
        new Promise((resolve) => {
          completeWrite = () => {
            nativeValues.set(key, value)
            resolve()
          }
        }),
    )

    const pendingWrite = repository.write(visiblePreferences)
    await vi.waitFor(() => expect(storage.writeNative).toHaveBeenCalledOnce())
    const pendingRead = repository.read()
    completeWrite()

    await expect(pendingWrite).resolves.toBeUndefined()
    await expect(pendingRead).resolves.toEqual(visiblePreferences)
    expect(storage.readNative).toHaveBeenCalledOnce()
  })
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

it('should use the default when native preferences are empty', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.getItem.mockResolvedValue(null)

  await expect(readPDisplayPreferences()).resolves.toEqual(DEFAULT_P_DISPLAY_PREFERENCES)
})

it('should reject a native read failure instead of using the browser copy', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  localStorage.setItem('pomo:focus-room-display-preferences:v1', JSON.stringify(visiblePreferences))
  storageMocks.getItem.mockRejectedValue(new Error('native unavailable'))

  await expect(readPDisplayPreferences()).rejects.toThrow(
    'Failed to read focus-room display preferences.',
  )
})

it('should replace a stale browser copy with the native preferences', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  const hiddenPreferences = {dialogueComposerVisible: false} as const
  localStorage.setItem('pomo:focus-room-display-preferences:v1', JSON.stringify(hiddenPreferences))
  storageMocks.getItem.mockResolvedValue(JSON.stringify(visiblePreferences))

  await expect(readPDisplayPreferences()).resolves.toEqual(visiblePreferences)
  expect(storageMocks.getItem).toHaveBeenCalledWith('pomo:focus-room-display-preferences:v1')
  expect(localStorage.getItem('pomo:focus-room-display-preferences:v1')).toBe(
    JSON.stringify(visiblePreferences),
  )
})

it('should reject a native save when native storage fails', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  storageMocks.setItem.mockRejectedValue(new Error('native unavailable'))

  await expect(writePDisplayPreferences(visiblePreferences)).rejects.toThrow(
    'Failed to persist focus-room display preferences.',
  )
})

it('should restore native state after a failed native save', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  const hiddenPreferences = {dialogueComposerVisible: false} as const
  storageMocks.getItem.mockResolvedValue(JSON.stringify(hiddenPreferences))
  storageMocks.setItem.mockRejectedValueOnce(new Error('native unavailable'))

  await expect(writePDisplayPreferences(visiblePreferences)).rejects.toThrow(
    'Failed to persist focus-room display preferences.',
  )
  await expect(readPDisplayPreferences()).resolves.toEqual(hiddenPreferences)
  expect(localStorage.getItem('pomo:focus-room-display-preferences:v1')).toBe(
    JSON.stringify(hiddenPreferences),
  )
})

it('should preserve a newer choice while native preferences are loading', async () => {
  Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
  let nativePreferences = JSON.stringify({dialogueComposerVisible: false})
  let completeRead: (value: string) => void = () => undefined
  storageMocks.getItem
    .mockReturnValueOnce(
      new Promise((resolve) => {
        completeRead = resolve
      }),
    )
    .mockImplementation(async () => nativePreferences)
  storageMocks.setItem.mockImplementation(async (_key, value) => {
    nativePreferences = value
  })

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
