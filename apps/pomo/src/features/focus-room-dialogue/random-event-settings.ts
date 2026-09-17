import {z} from 'zod'

import {type PreferenceStorage, webLocalStorage} from 'src/utils/preference-storage'
import {withPromiseNull} from 'src/utils/with-promise-null'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

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

/** Reads and writes random event settings using the selected runtime storage. */
export const createRandomEventSettingsRepository = (
  storage: RandomEventSettingsStorage,
): RandomEventSettingsRepository => {
  let prefersNativeSettings = false

  /** Reads the random event settings from storage whose lifetime matches the current runtime. */
  const read = async (): Promise<RandomEventSettings> => {
    const isNative = storage.isNative()
    const webSettings = isNative && prefersNativeSettings ? null : storage.readWeb()

    if (webSettings !== null) {
      if (isNative) {
        await withPromiseNull(storage.writeToss(webSettings))
      }

      return webSettings
    }

    if (!isNative) {
      return DEFAULT_RANDOM_EVENT_SETTINGS
    }

    try {
      const tossSettings = await storage.readToss()

      if (tossSettings === null) {
        return DEFAULT_RANDOM_EVENT_SETTINGS
      }

      prefersNativeSettings = storage.writeWeb(tossSettings) !== null
      return tossSettings
    } catch {
      return storage.readWeb() ?? DEFAULT_RANDOM_EVENT_SETTINGS
    }
  }

  /** Persists random event settings until the host app or browser data is removed. */
  const write = async (settings: RandomEventSettings): Promise<void> => {
    const snapshot = randomEventSettingsSchema.parse(settings)
    const webWriteError = storage.writeWeb(snapshot)

    if (webWriteError === null) {
      prefersNativeSettings = false
    }

    if (!storage.isNative()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist random event settings.', {cause: webWriteError})
      }

      return
    }

    try {
      await storage.writeToss(snapshot)
      if (webWriteError !== null) {
        prefersNativeSettings = true
      }
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

const preferenceStorage: PreferenceStorage = {
  read: () => runtimeRepository.read(),
  subscribe: webLocalStorage.subscribe,
  write: (_key, value) => {
    const settings = parseRandomEventSettings(value)

    return settings === null
      ? new Error('Invalid random event settings.')
      : runtimeRepository.write(settings).then(() => undefined)
  },
}

export interface RandomEventPreferenceOptions {
  readonly onError?: (error: unknown) => void
  readonly onSaved?: () => void
}

/** Creates the shared preference definition for random event settings. */
export const createRandomEventPreferenceOptions = (options: RandomEventPreferenceOptions = {}) => ({
  defaultValue: DEFAULT_RANDOM_EVENT_SETTINGS,
  key: STORAGE_KEY,
  onError: options.onError,
  onSaved: options.onSaved,
  parse: parseRandomEventSettings,
  storage: preferenceStorage,
})

/** Reads random event settings for the current runtime. */
export const readRandomEventSettings = (): Promise<RandomEventSettings> => runtimeRepository.read()

/** Persists random event settings for the current runtime. */
export const writeRandomEventSettings = (settings: RandomEventSettings): Promise<void> =>
  runtimeRepository.write(settings)
