/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createDisplayThemePreferenceRepository,
  type DisplayThemePreferenceStorage,
} from '../features/display-theme/storage'
import {createScreenSaverRepository, type ScreenSaverStorage} from '../features/screen-saver/storage'

const STORAGE_KEY = 'pomo:display-theme:v1'

const createStorageHarness = () => {
  const tossValues = new Map<string, unknown>()
  const webValues = new Map<string, unknown>()
  const storage = {
    readToss: vi.fn(async (key: string) => tossValues.get(key) ?? null),
    readWeb: vi.fn((key: string) => webValues.get(key) ?? null),
    removeWeb: vi.fn((key: string) => {
      webValues.delete(key)
      return null as unknown
    }),
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

describe('authoritative native preference vs stale web cache', () => {
  let harness: ReturnType<typeof createStorageHarness>

  beforeEach(() => {
    harness = createStorageHarness()
    harness.webValues.set(STORAGE_KEY, 'dark')
    harness.tossValues.set(STORAGE_KEY, 'dark')
  })

  it('should not downgrade display theme native storage when web cache is older than native', async () => {
    const {repository, storage, tossValues, webValues} = harness
    webValues.set(STORAGE_KEY, 'dark')
    tossValues.set(STORAGE_KEY, 'bright')

    await expect(repository.read()).resolves.toBe('dark')

    expect(storage.writeToss).toHaveBeenCalledWith(STORAGE_KEY, 'dark')
    expect(tossValues.get(STORAGE_KEY)).toBe('bright')
  })

  it('should not downgrade screen saver native storage when web cache is older than native', async () => {
    const tossValues = new Map<string, unknown>()
    let webValue: unknown = 'off'
    let nativeValue: unknown = '1h'
    const storage = {
      readToss: vi.fn(async () => nativeValue),
      readWeb: vi.fn(() => webValue),
      removeWeb: vi.fn(() => {
        webValue = null
        return null as unknown
      }),
      usesTossStorage: (): boolean => true,
      writeToss: vi.fn(async (_key: string, value: unknown) => {
        nativeValue = value
        tossValues.set('native', value)
      }),
      writeWeb: vi.fn((_key: string, value: unknown) => {
        webValue = value
        return null as unknown
      }),
    } satisfies ScreenSaverStorage
    const repository = createScreenSaverRepository(storage)

    await expect(repository.read()).resolves.toBe('off')

    expect(storage.writeToss).toHaveBeenCalledWith('pomo:screen-saver-delay:v1', 'off')
    expect(nativeValue).toBe('1h')
  })
})
