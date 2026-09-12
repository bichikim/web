/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createDisplayThemePreferenceRepository,
  type DisplayThemePreferenceRepository,
  type DisplayThemePreferenceStorage,
  readDisplayThemePreference,
  writeDisplayThemePreference,
} from '../index'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn<(key: string) => Promise<string | null>>(),
  setItem: vi.fn<(key: string, value: string) => Promise<void>>(),
}))

vi.mock('@apps-in-toss/web-framework', () => ({Storage: storageMocks}))

const STORAGE_KEY = 'pomo:display-theme:v1'

const createStorageHarness = () => {
  const tossValues = new Map<string, unknown>()
  const webValues = new Map<string, unknown>()
  const storage = {
    readToss: vi.fn<(key: string) => Promise<unknown | null>>(async (key) => {
      return tossValues.get(key) ?? null
    }),
    readWeb: vi.fn<(key: string) => unknown | null>((key) => webValues.get(key) ?? null),
    usesTossStorage: vi.fn(() => false),
    writeToss: vi.fn(async (key: string, value: unknown) => {
      tossValues.set(key, value)
    }),
    writeWeb: vi.fn((key: string, value: unknown) => {
      webValues.set(key, value)
    }),
  } satisfies DisplayThemePreferenceStorage

  return {
    repository: createDisplayThemePreferenceRepository({storage}),
    storage,
    tossValues,
    webValues,
  }
}

let tossValues: Map<string, unknown>
let repository: DisplayThemePreferenceRepository
let storage: ReturnType<typeof createStorageHarness>['storage']
let webValues: Map<string, unknown>

beforeEach(() => {
  ;({tossValues, repository, storage, webValues} = createStorageHarness())
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
})

describe('display theme preference repository', () => {
  it('should default invalid or missing browser preferences to dark', async () => {
    await expect(repository.read()).resolves.toBe('dark')

    webValues.set(STORAGE_KEY, 'unknown')
    await expect(repository.read()).resolves.toBe('dark')
  })

  it('should persist and restore a browser preference', async () => {
    await repository.write('bright')

    await expect(repository.read()).resolves.toBe('bright')
    expect(webValues.get(STORAGE_KEY)).toBe('bright')
    expect(storage.writeToss).not.toHaveBeenCalled()
  })

  it('should reject a browser save when browser storage fails', async () => {
    storage.writeWeb.mockImplementation(() => {
      throw new Error('Browser storage unavailable')
    })

    await expect(repository.write('bright')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
  })

  it('should restore a toss preference and rebuild the browser copy', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    tossValues.set(STORAGE_KEY, 'dark')

    await expect(repository.read()).resolves.toBe('dark')
    expect(webValues.get(STORAGE_KEY)).toBe('dark')
  })

  it('should replace a stale browser copy with the toss preference', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    webValues.set(STORAGE_KEY, 'bright')
    tossValues.set(STORAGE_KEY, 'dark')

    await expect(repository.read()).resolves.toBe('dark')
    expect(storage.readToss).toHaveBeenCalledWith(STORAGE_KEY)
    expect(webValues.get(STORAGE_KEY)).toBe('dark')
  })

  it('should replace invalid or missing toss preferences with the default', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    webValues.set(STORAGE_KEY, 'dark')

    await expect(repository.read()).resolves.toBe('dark')
    expect(webValues.get(STORAGE_KEY)).toBe('dark')

    tossValues.set(STORAGE_KEY, 'unknown')
    await expect(repository.read()).resolves.toBe('dark')
  })

  it('should reject a toss read failure instead of using the browser copy', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    webValues.set(STORAGE_KEY, 'bright')
    storage.readToss.mockRejectedValue(new Error('Toss storage unavailable'))

    await expect(repository.read()).rejects.toThrow('Failed to read display theme preference.')
  })

  it('should persist through toss storage when the browser cache is unavailable', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    storage.writeWeb.mockImplementation(() => {
      throw new Error('Browser storage unavailable')
    })

    await expect(repository.write('dark')).resolves.toBeUndefined()
    expect(tossValues.get(STORAGE_KEY)).toBe('dark')
  })

  it('should reject a toss save when toss storage fails', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    storage.writeToss.mockRejectedValue(new Error('Toss storage unavailable'))

    await expect(repository.write('bright')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
    expect(webValues.get(STORAGE_KEY)).toBe('bright')
  })

  it('should restore toss state after a failed toss save', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    tossValues.set(STORAGE_KEY, 'dark')
    storage.writeToss.mockRejectedValueOnce(new Error('Toss storage unavailable'))

    await expect(repository.write('bright')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
    await expect(repository.read()).resolves.toBe('dark')
    expect(webValues.get(STORAGE_KEY)).toBe('dark')
  })

  it('should continue toss writes after an earlier write fails', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    storage.writeToss
      .mockRejectedValueOnce(new Error('Toss storage unavailable'))
      .mockImplementationOnce(async (key, value) => {
        tossValues.set(key, value)
      })

    await expect(repository.write('dark')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
    await expect(repository.write('bright')).resolves.toBeUndefined()
    expect(tossValues.get(STORAGE_KEY)).toBe('bright')
  })

  it('should preserve toss write order during rapid preference changes', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    const tossWrites: unknown[] = []
    let completeFirstWrite: () => void = () => undefined
    storage.writeToss.mockImplementation(async (_key, value) => {
      tossWrites.push(value)

      if (tossWrites.length === 1) {
        await new Promise<void>((resolve) => {
          completeFirstWrite = resolve
        })
      }
    })

    const firstWrite = repository.write('dark')
    const secondWrite = repository.write('system')
    await vi.waitFor(() => expect(tossWrites.length).toBeGreaterThan(0))

    expect(tossWrites).toEqual(['dark'])
    completeFirstWrite()
    await Promise.all([firstWrite, secondWrite])
    expect(tossWrites).toEqual(['dark', 'system'])
  })

  it('should keep a newer toss choice when an earlier toss read completes late', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    let completeRead: (value: unknown) => void = () => undefined
    storage.readToss.mockReturnValueOnce(
      new Promise((resolve) => {
        completeRead = resolve
      }),
    )

    const pendingRead = repository.read()
    await vi.waitFor(() => expect(storage.readToss).toHaveBeenCalledOnce())
    await repository.write('bright')
    completeRead('dark')

    await expect(pendingRead).resolves.toBe('bright')
    expect(webValues.get(STORAGE_KEY)).toBe('bright')
  })

  it('should wait for an active toss write before reading the preference', async () => {
    storage.usesTossStorage.mockReturnValue(true)
    tossValues.set(STORAGE_KEY, 'dark')
    let completeWrite: () => void = () => undefined
    storage.writeToss.mockImplementation(
      (key, value) =>
        new Promise((resolve) => {
          completeWrite = () => {
            tossValues.set(key, value)
            resolve()
          }
        }),
    )

    const pendingWrite = repository.write('bright')
    await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledOnce())
    const pendingRead = repository.read()
    completeWrite()

    await expect(pendingWrite).resolves.toBeUndefined()
    await expect(pendingRead).resolves.toBe('bright')
    expect(storage.readToss).toHaveBeenCalledOnce()
  })
})

describe('display theme runtime storage adapter', () => {
  it('should read toss storage before a stale browser cache', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(STORAGE_KEY, '"bright"')
    storageMocks.getItem.mockResolvedValue('"dark"')

    await expect(readDisplayThemePreference()).resolves.toBe('dark')
    expect(storageMocks.getItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('"dark"')
  })

  it('should propagate a toss storage error as a rejected save', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.setItem.mockRejectedValue(new Error('Toss storage unavailable'))

    await expect(writeDisplayThemePreference('bright')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
  })
})
