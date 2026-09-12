import {z} from 'zod'

import {createLatestAsyncTask} from 'src/utils/create-latest-async-task'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

export const RANDOM_EVENT_SETTINGS_CHANGED_EVENT = 'pomo:random-event-settings-changed'

export interface RandomEventSettings {
  readonly maximumMinutes: number
  readonly minimumMinutes: number
  readonly version: 1
}

export const DEFAULT_RANDOM_EVENT_SETTINGS = {
  maximumMinutes: 20,
  minimumMinutes: 10,
  version: 1,
} as const satisfies RandomEventSettings

const STORAGE_KEY = 'pomo:random-event-settings:v1'
const MAXIMUM_INTERVAL_MINUTES = 120
const MINIMUM_INTERVAL_MINUTES = 1
const randomEventSettingsSchema: z.ZodType<RandomEventSettings> = z
  .object({
    maximumMinutes: z.number().int().min(MINIMUM_INTERVAL_MINUTES).max(MAXIMUM_INTERVAL_MINUTES),
    minimumMinutes: z.number().int().min(MINIMUM_INTERVAL_MINUTES).max(MAXIMUM_INTERVAL_MINUTES),
    version: z.literal(1),
  })
  .refine((settings) => settings.minimumMinutes <= settings.maximumMinutes)

export const parseRandomEventSettings = (value: unknown): RandomEventSettings | null => {
  const result = randomEventSettingsSchema.safeParse(value)
  return result.success ? result.data : null
}

export interface RandomEventSettingsStorage {
  readonly isNative: () => boolean
  readonly readWeb: () => RandomEventSettings | null
  readonly readToss: () => Promise<RandomEventSettings | null>
  /** Returns null on success, or the storage error on failure. */
  readonly writeWeb: (settings: RandomEventSettings) => unknown | null
  readonly writeToss: (settings: RandomEventSettings) => Promise<void>
}

export interface RandomEventSettingsRepository {
  readonly read: () => Promise<RandomEventSettings>
  readonly write: (settings: RandomEventSettings) => Promise<void>
}

/** Creates random event persistence with independent revision and latest-write coordination. */
export const createRandomEventSettingsRepository = (
  storage: RandomEventSettingsStorage,
): RandomEventSettingsRepository => {
  let preferenceWriteRevision = 0
  const writeLatestToss = createLatestAsyncTask((settings: RandomEventSettings) =>
    storage.writeToss(settings),
  )

  /** Reads the random event settings from storage whose lifetime matches the current runtime. */
  const read = async (): Promise<RandomEventSettings> => {
    const initialWriteRevision = preferenceWriteRevision
    const webSettings = storage.readWeb()

    if (webSettings !== null) {
      return webSettings
    }

    if (!storage.isNative()) {
      return DEFAULT_RANDOM_EVENT_SETTINGS
    }

    try {
      const tossSettings = await storage.readToss()

      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }

      if (tossSettings === null) {
        return DEFAULT_RANDOM_EVENT_SETTINGS
      }

      storage.writeWeb(tossSettings)
      return tossSettings
    } catch {
      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }

      return storage.readWeb() ?? DEFAULT_RANDOM_EVENT_SETTINGS
    }
  }

  /** Persists random event settings until the host app or browser data is removed. */
  const write = async (settings: RandomEventSettings): Promise<void> => {
    const snapshot = randomEventSettingsSchema.parse(settings)
    preferenceWriteRevision += 1
    const webWriteError = storage.writeWeb(snapshot)

    if (!storage.isNative()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist random event settings.', {cause: webWriteError})
      }

      return
    }

    try {
      await writeLatestToss(snapshot)
    } catch (error: unknown) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist random event settings.', {cause: error})
      }
    }
  }

  return {read, write}
}

const runtimeRepository = createRandomEventSettingsRepository({
  isNative: hasNativeStorageBridge,
  readToss: () => readTossStorageJson(STORAGE_KEY, parseRandomEventSettings),
  readWeb: () => readWebStorageJson(STORAGE_KEY, parseRandomEventSettings),
  writeToss: (settings) => writeTossStorageJson(STORAGE_KEY, settings),
  writeWeb: (settings) => writeWebStorageJson(STORAGE_KEY, settings),
})

/** Reads random event settings for the current runtime. */
export const readRandomEventSettings = (): Promise<RandomEventSettings> => runtimeRepository.read()

/** Persists random event settings for the current runtime. */
export const writeRandomEventSettings = (settings: RandomEventSettings): Promise<void> =>
  runtimeRepository.write(settings)
