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

describe('display theme overlapping native writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should keep the latest browser preference when an older native write finishes after a newer one', async () => {
    const {repository, storage, tossValues, webValues} = createStorageHarness()
    tossValues.set(STORAGE_KEY, 'dark')
    const firstWrite = Promise.withResolvers<void>()
    const secondWrite = Promise.withResolvers<void>()
    storage.writeToss
      .mockImplementationOnce(
        (key, value) =>
          new Promise<void>((resolve) => {
            firstWrite.resolve = () => {
              tossValues.set(key, value)
              resolve()
            }
          }),
      )
      .mockImplementationOnce(
        (key, value) =>
          new Promise<void>((resolve) => {
            secondWrite.resolve = () => {
              tossValues.set(key, value)
              resolve()
            }
          }),
      )

    const savingDark = repository.write('dark')
    await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledOnce())
    const savingBright = repository.write('bright')
    await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledTimes(2))

    secondWrite.resolve()
    await savingBright
    firstWrite.resolve()
    await savingDark

    expect(webValues.get(STORAGE_KEY)).toBe('bright')
    expect(tossValues.get(STORAGE_KEY)).toBe('bright')
  })
})
