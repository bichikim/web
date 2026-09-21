/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  createPDisplayPreferencesRepository,
  type PDisplayPreferencesStorage,
} from '../features/focus-room-display-preferences/storage'

const STORAGE_KEY = 'pomo:focus-room-display-preferences:v1'

const visiblePreferences = {
  dialogueComposerVisible: true,
  featureRequestVisible: true,
  memoryAssistVisible: true,
  playerVisible: true,
  pomodoroVisible: true,
  toolsButtonVisible: true,
  tourButtonVisible: true,
} as const

const hiddenPreferences = {
  dialogueComposerVisible: false,
  featureRequestVisible: true,
  memoryAssistVisible: true,
  playerVisible: true,
  pomodoroVisible: true,
  toolsButtonVisible: true,
  tourButtonVisible: true,
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
  } satisfies PDisplayPreferencesStorage

  return {
    repository: createPDisplayPreferencesRepository({storage}),
    storage,
    tossValues,
    webValues,
  }
}

describe('focus-room display preferences overlapping native writes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should keep the latest preference when an older native write finishes after a newer one', async () => {
    const {repository, storage, tossValues, webValues} = createStorageHarness()
    tossValues.set(STORAGE_KEY, hiddenPreferences)
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

    const savingHidden = repository.write(hiddenPreferences)
    await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledOnce())
    const savingVisible = repository.write(visiblePreferences)
    await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledTimes(2))

    secondWrite.resolve()
    await savingVisible
    firstWrite.resolve()
    await savingHidden

    expect(webValues.get(STORAGE_KEY)).toEqual(visiblePreferences)
    await expect(repository.read()).resolves.toEqual(visiblePreferences)
  })
})
