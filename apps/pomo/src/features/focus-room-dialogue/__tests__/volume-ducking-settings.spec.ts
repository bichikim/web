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
  } satisfies DialogueVolumeDuckingSettingsStorage

  return {
    nativeValues,
    repository: createDialogueVolumeDuckingSettingsRepository({storage}),
    storage,
    webValues,
  }
}

let nativeValues: Map<string, unknown>
let repository: DialogueVolumeDuckingSettingsRepository
let storage: ReturnType<typeof createStorageHarness>['storage']
let webValues: Map<string, unknown>

beforeEach(() => {
  ;({nativeValues, repository, storage, webValues} = createStorageHarness())
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
  expect(storage.writeNative).not.toHaveBeenCalled()
})

it('should restore native settings when the browser copy is unavailable', async () => {
  const settings = {enabled: false, playerVolumePercent: 65, version: 2} as const
  storage.isNative.mockReturnValue(true)
  nativeValues.set(STORAGE_KEY, settings)

  await expect(repository.read()).resolves.toEqual(settings)
  expect(webValues.get(STORAGE_KEY)).toEqual(settings)
})

it('should replace a stale browser cache with authoritative native settings', async () => {
  const staleSettings = {enabled: true, playerVolumePercent: 70, version: 2} as const
  const nativeSettings = {enabled: false, playerVolumePercent: 20, version: 2} as const
  storage.isNative.mockReturnValue(true)
  webValues.set(STORAGE_KEY, staleSettings)
  nativeValues.set(STORAGE_KEY, nativeSettings)

  await expect(repository.read()).resolves.toEqual(nativeSettings)
  expect(storage.readNative).toHaveBeenCalledWith(STORAGE_KEY)
  expect(webValues.get(STORAGE_KEY)).toEqual(nativeSettings)
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

it('should reinterpret legacy native settings when browser settings are unavailable', async () => {
  storage.isNative.mockReturnValue(true)
  nativeValues.set(LEGACY_STORAGE_KEY, {enabled: false, reductionPercent: 25, version: 1})

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

it('should default when browser settings are invalid or native settings are missing', async () => {
  webValues.set(LEGACY_STORAGE_KEY, {enabled: true, reductionPercent: 101, version: 1})
  await expect(repository.read()).resolves.toEqual(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)

  webValues.clear()
  storage.isNative.mockReturnValue(true)
  await expect(repository.read()).resolves.toEqual(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
})

it('should reject a native read failure instead of restoring a stale browser cache', async () => {
  const staleSettings = {enabled: true, playerVolumePercent: 70, version: 2} as const
  storage.isNative.mockReturnValue(true)
  webValues.set(STORAGE_KEY, staleSettings)
  storage.readNative.mockRejectedValue(new Error('native unavailable'))

  await expect(repository.read()).rejects.toThrow(
    'Failed to read dialogue volume ducking settings.',
  )
})

it('should not let a native read overwrite a newer browser setting', async () => {
  const nativeSettings = {enabled: false, playerVolumePercent: 70, version: 2} as const
  const latestSettings = {enabled: true, playerVolumePercent: 20, version: 2} as const
  let resolveNativeRead: (value: unknown | null) => void = () => undefined
  storage.isNative.mockReturnValue(true)
  storage.readNative.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveNativeRead = (value) => resolve(value)
      }),
  )

  const readRequest = repository.read()
  await repository.write(latestSettings)
  resolveNativeRead(nativeSettings)

  await expect(readRequest).resolves.toEqual(nativeSettings)
  expect(webValues.get(STORAGE_KEY)).toEqual(latestSettings)
})

it('should persist through native storage when the browser cache is unavailable', async () => {
  const settings = {enabled: true, playerVolumePercent: 30, version: 2} as const
  storage.isNative.mockReturnValue(true)
  storage.writeWeb.mockImplementation(() => {
    throw new Error('browser unavailable')
  })

  await expect(repository.write(settings)).resolves.toBeUndefined()
  expect(nativeValues.get(STORAGE_KEY)).toEqual(settings)
})

it('should reject a native runtime save when native storage is unavailable', async () => {
  const settings = {enabled: true, playerVolumePercent: 30, version: 2} as const
  storage.isNative.mockReturnValue(true)
  storage.writeNative.mockRejectedValue(new Error('native unavailable'))

  await expect(repository.write(settings)).rejects.toThrow(
    'Failed to persist dialogue volume ducking settings.',
  )
  expect(webValues.get(STORAGE_KEY)).toEqual(settings)
})
