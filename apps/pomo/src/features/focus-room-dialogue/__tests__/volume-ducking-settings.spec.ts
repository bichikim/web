/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import {
  createDialogueVolumeDuckingSettingsRepository,
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  type DialogueVolumeDuckingSettingsRepository,
  type DialogueVolumeDuckingSettingsStorage,
  parseDialogueVolumeDuckingSettings,
} from '../volume-ducking-settings'

const STORAGE_KEY = 'pomo:dialogue-volume-ducking-settings:v2'
const LEGACY_STORAGE_KEY = 'pomo:dialogue-volume-ducking-settings:v1'

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
  } satisfies DialogueVolumeDuckingSettingsStorage

  return {
    repository: createDialogueVolumeDuckingSettingsRepository({storage}),
    storage,
    tossValues,
    webValues,
  }
}

let tossValues: Map<string, unknown>
let repository: DialogueVolumeDuckingSettingsRepository
let storage: ReturnType<typeof createStorageHarness>['storage']
let webValues: Map<string, unknown>

beforeEach(() => {
  ;({tossValues, repository, storage, webValues} = createStorageHarness())
})

it('should default dialogue player output to fifty percent', async () => {
  expect(await repository.read()).toEqual(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
})

it('should parse valid settings and reject invalid percentages', () => {
  const settings = {enabled: false, playerVolumePercent: 72, version: 2} as const

  expect(parseDialogueVolumeDuckingSettings(settings)).toEqual(settings)
  expect(parseDialogueVolumeDuckingSettings({...settings, playerVolumePercent: 101})).toBeNull()
})

it('should persist and restore browser settings', async () => {
  const settings = {enabled: true, playerVolumePercent: 35, version: 2} as const

  await repository.write(settings)

  await expect(repository.read()).resolves.toEqual(settings)
  expect(webValues.get(STORAGE_KEY)).toEqual(settings)
  expect(storage.writeToss).not.toHaveBeenCalled()
})

it('should restore toss settings when the browser copy is unavailable', async () => {
  const settings = {enabled: false, playerVolumePercent: 65, version: 2} as const
  storage.usesTossStorage.mockReturnValue(true)
  tossValues.set(STORAGE_KEY, settings)

  await expect(repository.read()).resolves.toEqual(settings)
  expect(webValues.get(STORAGE_KEY)).toEqual(settings)
})

it('should replace a stale browser cache with authoritative toss settings', async () => {
  const staleSettings = {enabled: true, playerVolumePercent: 70, version: 2} as const
  const tossSettings = {enabled: false, playerVolumePercent: 20, version: 2} as const
  storage.usesTossStorage.mockReturnValue(true)
  webValues.set(STORAGE_KEY, staleSettings)
  tossValues.set(STORAGE_KEY, tossSettings)

  await expect(repository.read()).resolves.toEqual(tossSettings)
  expect(storage.readToss).toHaveBeenCalledWith(STORAGE_KEY)
  expect(webValues.get(STORAGE_KEY)).toEqual(tossSettings)
})

it('should reinterpret a legacy reduction percentage as the dialogue player volume', async () => {
  webValues.set(LEGACY_STORAGE_KEY, {enabled: true, reductionPercent: 10, version: 1})

  await expect(repository.read()).resolves.toEqual({
    enabled: true,
    playerVolumePercent: 10,
    version: 2,
  })
  expect(webValues.get(STORAGE_KEY)).toEqual({
    enabled: true,
    playerVolumePercent: 10,
    version: 2,
  })
})

it('should reinterpret legacy toss settings when browser settings are unavailable', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  tossValues.set(LEGACY_STORAGE_KEY, {enabled: false, reductionPercent: 25, version: 1})

  await expect(repository.read()).resolves.toEqual({
    enabled: false,
    playerVolumePercent: 25,
    version: 2,
  })
})

it('should reject when browser storage cannot persist settings', async () => {
  storage.writeWeb.mockImplementation(() => {
    throw new Error('Browser storage unavailable')
  })

  await expect(
    repository.write({enabled: true, playerVolumePercent: 35, version: 2}),
  ).rejects.toThrow('Failed to persist dialogue volume ducking settings.')
})

it('should default when browser settings are invalid or toss settings are missing', async () => {
  webValues.set(LEGACY_STORAGE_KEY, {enabled: true, reductionPercent: 101, version: 1})
  await expect(repository.read()).resolves.toEqual(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)

  webValues.clear()
  storage.usesTossStorage.mockReturnValue(true)
  await expect(repository.read()).resolves.toEqual(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
})

it('should reject a toss read failure instead of restoring a stale browser cache', async () => {
  const staleSettings = {enabled: true, playerVolumePercent: 70, version: 2} as const
  storage.usesTossStorage.mockReturnValue(true)
  webValues.set(STORAGE_KEY, staleSettings)
  storage.readToss.mockRejectedValue(new Error('toss unavailable'))

  await expect(repository.read()).rejects.toThrow(
    'Failed to read dialogue volume ducking settings.',
  )
})

it('should not let a pending toss read replace a newer setting', async () => {
  const tossSettings = {enabled: false, playerVolumePercent: 70, version: 2} as const
  const latestSettings = {enabled: true, playerVolumePercent: 20, version: 2} as const
  let resolveTossRead: (value: unknown | null) => void = () => undefined
  storage.usesTossStorage.mockReturnValue(true)
  storage.readToss.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveTossRead = (value) => resolve(value)
      }),
  )

  const readRequest = repository.read()
  await repository.write(latestSettings)
  resolveTossRead(tossSettings)

  await expect(readRequest).resolves.toEqual(latestSettings)
  expect(webValues.get(STORAGE_KEY)).toEqual(latestSettings)
})

it('should wait for an active toss write before reading settings', async () => {
  storage.usesTossStorage.mockReturnValue(true)
  tossValues.set(STORAGE_KEY, DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
  const latestSettings = {enabled: true, playerVolumePercent: 20, version: 2} as const
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

  const pendingWrite = repository.write(latestSettings)
  await vi.waitFor(() => expect(storage.writeToss).toHaveBeenCalledOnce())
  const pendingRead = repository.read()
  completeWrite()

  await expect(pendingWrite).resolves.toBeUndefined()
  await expect(pendingRead).resolves.toEqual(latestSettings)
  expect(storage.readToss).toHaveBeenCalledOnce()
})

it('should persist through toss storage when the browser cache is unavailable', async () => {
  const settings = {enabled: true, playerVolumePercent: 30, version: 2} as const
  storage.usesTossStorage.mockReturnValue(true)
  storage.writeWeb.mockImplementation(() => {
    throw new Error('browser unavailable')
  })

  await expect(repository.write(settings)).resolves.toBeUndefined()
  expect(tossValues.get(STORAGE_KEY)).toEqual(settings)
})

it('should reject a toss runtime save when toss storage is unavailable', async () => {
  const settings = {enabled: true, playerVolumePercent: 30, version: 2} as const
  storage.usesTossStorage.mockReturnValue(true)
  storage.writeToss.mockRejectedValue(new Error('toss unavailable'))

  await expect(repository.write(settings)).rejects.toThrow(
    'Failed to persist dialogue volume ducking settings.',
  )
  expect(webValues.get(STORAGE_KEY)).toEqual(settings)
})

it('should continue toss writes after an earlier write fails', async () => {
  const failedSettings = {enabled: false, playerVolumePercent: 70, version: 2} as const
  const latestSettings = {enabled: true, playerVolumePercent: 20, version: 2} as const
  storage.usesTossStorage.mockReturnValue(true)
  storage.writeToss
    .mockRejectedValueOnce(new Error('toss unavailable'))
    .mockImplementationOnce(async (key, value) => {
      tossValues.set(key, value)
    })

  await expect(repository.write(failedSettings)).rejects.toThrow(
    'Failed to persist dialogue volume ducking settings.',
  )
  await expect(repository.write(latestSettings)).resolves.toBeUndefined()

  expect(tossValues.get(STORAGE_KEY)).toEqual(latestSettings)
})
