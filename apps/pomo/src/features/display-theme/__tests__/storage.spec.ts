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
  } satisfies DisplayThemePreferenceStorage

  return {
    nativeValues,
    repository: createDisplayThemePreferenceRepository({storage}),
    storage,
    webValues,
  }
}

let nativeValues: Map<string, unknown>
let repository: DisplayThemePreferenceRepository
let storage: ReturnType<typeof createStorageHarness>['storage']
let webValues: Map<string, unknown>

beforeEach(() => {
  ;({nativeValues, repository, storage, webValues} = createStorageHarness())
  localStorage.clear()
  storageMocks.getItem.mockReset()
  storageMocks.setItem.mockReset()
})

afterEach(() => {
  Reflect.deleteProperty(window, 'ReactNativeWebView')
})

describe('display theme preference repository', () => {
  it('should default invalid or missing browser preferences to system', async () => {
    await expect(repository.read()).resolves.toBe('system')

    webValues.set(STORAGE_KEY, 'unknown')
    await expect(repository.read()).resolves.toBe('system')
  })

  it('should persist and restore a browser preference', async () => {
    await repository.write('bright')

    await expect(repository.read()).resolves.toBe('bright')
    expect(webValues.get(STORAGE_KEY)).toBe('bright')
    expect(storage.writeNative).not.toHaveBeenCalled()
  })

  it('should reject a browser save when browser storage fails', async () => {
    storage.writeWeb.mockImplementation(() => {
      throw new Error('Browser storage unavailable')
    })

    await expect(repository.write('bright')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
  })

  it('should restore a native preference and rebuild the browser copy', async () => {
    storage.isNative.mockReturnValue(true)
    nativeValues.set(STORAGE_KEY, 'dark')

    await expect(repository.read()).resolves.toBe('dark')
    expect(webValues.get(STORAGE_KEY)).toBe('dark')
  })

  it('should replace a stale browser copy with the native preference', async () => {
    storage.isNative.mockReturnValue(true)
    webValues.set(STORAGE_KEY, 'bright')
    nativeValues.set(STORAGE_KEY, 'dark')

    await expect(repository.read()).resolves.toBe('dark')
    expect(storage.readNative).toHaveBeenCalledWith(STORAGE_KEY)
    expect(webValues.get(STORAGE_KEY)).toBe('dark')
  })

  it('should replace invalid or missing native preferences with the default', async () => {
    storage.isNative.mockReturnValue(true)
    webValues.set(STORAGE_KEY, 'dark')

    await expect(repository.read()).resolves.toBe('system')
    expect(webValues.get(STORAGE_KEY)).toBe('system')

    nativeValues.set(STORAGE_KEY, 'unknown')
    await expect(repository.read()).resolves.toBe('system')
  })

  it('should reject a native read failure instead of using the browser copy', async () => {
    storage.isNative.mockReturnValue(true)
    webValues.set(STORAGE_KEY, 'bright')
    storage.readNative.mockRejectedValue(new Error('Native storage unavailable'))

    await expect(repository.read()).rejects.toThrow('Failed to read display theme preference.')
  })

  it('should persist through native storage when the browser cache is unavailable', async () => {
    storage.isNative.mockReturnValue(true)
    storage.writeWeb.mockImplementation(() => {
      throw new Error('Browser storage unavailable')
    })

    await expect(repository.write('dark')).resolves.toBeUndefined()
    expect(nativeValues.get(STORAGE_KEY)).toBe('dark')
  })

  it('should reject a native save when native storage fails', async () => {
    storage.isNative.mockReturnValue(true)
    storage.writeNative.mockRejectedValue(new Error('Native storage unavailable'))

    await expect(repository.write('bright')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
    expect(webValues.get(STORAGE_KEY)).toBe('bright')
  })

  it('should restore native state after a failed native save', async () => {
    storage.isNative.mockReturnValue(true)
    nativeValues.set(STORAGE_KEY, 'dark')
    storage.writeNative.mockRejectedValueOnce(new Error('Native storage unavailable'))

    await expect(repository.write('bright')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
    await expect(repository.read()).resolves.toBe('dark')
    expect(webValues.get(STORAGE_KEY)).toBe('dark')
  })

  it('should continue native writes after an earlier write fails', async () => {
    storage.isNative.mockReturnValue(true)
    storage.writeNative
      .mockRejectedValueOnce(new Error('Native storage unavailable'))
      .mockImplementationOnce(async (key, value) => {
        nativeValues.set(key, value)
      })

    await expect(repository.write('dark')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
    await expect(repository.write('bright')).resolves.toBeUndefined()
    expect(nativeValues.get(STORAGE_KEY)).toBe('bright')
  })

  it('should preserve native write order during rapid preference changes', async () => {
    storage.isNative.mockReturnValue(true)
    const nativeWrites: unknown[] = []
    let completeFirstWrite: () => void = () => undefined
    storage.writeNative.mockImplementation(async (_key, value) => {
      nativeWrites.push(value)

      if (nativeWrites.length === 1) {
        await new Promise<void>((resolve) => {
          completeFirstWrite = resolve
        })
      }
    })

    const firstWrite = repository.write('dark')
    const secondWrite = repository.write('system')
    await vi.waitFor(() => expect(nativeWrites.length).toBeGreaterThan(0))

    expect(nativeWrites).toEqual(['dark'])
    completeFirstWrite()
    await Promise.all([firstWrite, secondWrite])
    expect(nativeWrites).toEqual(['dark', 'system'])
  })

  it('should keep a newer native choice when an earlier native read completes late', async () => {
    storage.isNative.mockReturnValue(true)
    let completeRead: (value: unknown) => void = () => undefined
    storage.readNative.mockReturnValueOnce(
      new Promise((resolve) => {
        completeRead = resolve
      }),
    )

    const pendingRead = repository.read()
    await vi.waitFor(() => expect(storage.readNative).toHaveBeenCalledOnce())
    await repository.write('bright')
    completeRead('dark')

    await expect(pendingRead).resolves.toBe('bright')
    expect(webValues.get(STORAGE_KEY)).toBe('bright')
  })

  it('should wait for an active native write before reading the preference', async () => {
    storage.isNative.mockReturnValue(true)
    nativeValues.set(STORAGE_KEY, 'dark')
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

    const pendingWrite = repository.write('bright')
    await vi.waitFor(() => expect(storage.writeNative).toHaveBeenCalledOnce())
    const pendingRead = repository.read()
    completeWrite()

    await expect(pendingWrite).resolves.toBeUndefined()
    await expect(pendingRead).resolves.toBe('bright')
    expect(storage.readNative).toHaveBeenCalledOnce()
  })
})

describe('display theme runtime storage adapter', () => {
  it('should read native storage before a stale browser cache', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem(STORAGE_KEY, '"bright"')
    storageMocks.getItem.mockResolvedValue('"dark"')

    await expect(readDisplayThemePreference()).resolves.toBe('dark')
    expect(storageMocks.getItem).toHaveBeenCalledWith(STORAGE_KEY)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('"dark"')
  })

  it('should propagate a native storage error as a rejected save', async () => {
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    storageMocks.setItem.mockRejectedValue(new Error('Native storage unavailable'))

    await expect(writeDisplayThemePreference('bright')).rejects.toThrow(
      'Failed to persist display theme preference.',
    )
  })
})
