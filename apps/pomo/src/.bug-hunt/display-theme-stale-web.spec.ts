/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createDisplayThemePreferenceRepository,
  type DisplayThemePreferenceStorage,
} from '../features/display-theme/storage'

const STORAGE_KEY = 'pomo:display-theme:v1'

const createStorageHarness = () => {
  const tossValues = new Map<string, unknown>()
  const webValues = new Map<string, unknown>()
  const storage = {
    readToss: vi.fn<(key: string) => Promise<unknown | null>>(async (key) => {
      return tossValues.get(key) ?? null
    }),
    readWeb: vi.fn<(key: string) => unknown | null>((key) => webValues.get(key) ?? null),
    usesTossStorage: vi.fn(() => true),
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

describe('display theme stale web after native write succeeds', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should not let a stale browser copy override a persisted native preference on the next read', async () => {
    const {repository, storage, tossValues, webValues} = createStorageHarness()
    webValues.set(STORAGE_KEY, 'dark')
    storage.writeWeb.mockImplementation(() => {
      throw new Error('Browser storage unavailable')
    })

    await expect(repository.write('bright')).resolves.toBeUndefined()
    expect(tossValues.get(STORAGE_KEY)).toBe('bright')
    expect(webValues.get(STORAGE_KEY)).toBe('dark')

    await expect(repository.read()).resolves.toBe('bright')
    expect(tossValues.get(STORAGE_KEY)).toBe('bright')
  })
})
