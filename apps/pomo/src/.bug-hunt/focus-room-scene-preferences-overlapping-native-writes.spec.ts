/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createPScenePreferencesRepository,
  type PScenePreferencesStorage,
} from '../features/focus-room-scene-preferences/create-p-scene-preferences-repository'

const STORAGE_KEY = 'pomo:focus-room-scene-preferences:v1'

const stalePreferences = {
  activity: 'reading',
  gaze: 'focused',
  timeMode: 'day',
} as const

const updatedPreferences = {
  activity: 'typing',
  gaze: 'user',
  timeMode: 'night',
} as const

const createStorageHarness = () => {
  const tossValues = new Map<string, unknown>()
  const webValues = new Map<string, unknown>()
  const storage = {
    readToss: vi.fn(async (key: string) => tossValues.get(key) ?? null),
    readWeb: vi.fn((key: string) => webValues.get(key) ?? null),
    usesTossStorage: vi.fn(() => true),
    writeToss: vi.fn(async (key: string, value: unknown) => {
      tossValues.set(key, value)
    }),
    writeWeb: vi.fn((key: string, value: unknown) => {
      webValues.set(key, value)
    }),
  } satisfies PScenePreferencesStorage

  return {
    repository: createPScenePreferencesRepository({storage}),
    storage,
    tossValues,
    webValues,
  }
}

describe('focus-room scene preferences overlapping native writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should keep the latest preference when an older native write finishes after a newer one', async () => {
    const {repository, storage, tossValues, webValues} = createStorageHarness()
    tossValues.set(STORAGE_KEY, stalePreferences)
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

    const savingStale = repository.write(stalePreferences)
    await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledOnce())
    const savingUpdated = repository.write(updatedPreferences)
    await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledTimes(2))

    secondWrite.resolve()
    await savingUpdated
    firstWrite.resolve()
    await savingStale

    expect(webValues.get(STORAGE_KEY)).toEqual(updatedPreferences)
    expect(tossValues.get(STORAGE_KEY)).toEqual(updatedPreferences)
    await expect(repository.read()).resolves.toEqual(updatedPreferences)
  })
})
