import {createParsedPreferenceStorage} from '../parsed-preference-storage'
import {z} from 'zod'

import {webLocalStorage} from 'src/utils/preference-storage'
import {
  createVersionedPreferenceRepository,
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
): RandomEventSettingsRepository =>
  createVersionedPreferenceRepository({
    defaultValue: DEFAULT_RANDOM_EVENT_SETTINGS,
    parse: (settings) => randomEventSettingsSchema.parse(settings),
    storage: {
      isNative: storage.isNative,
      readNative: storage.readToss,
      readWeb: storage.readWeb,
      writeNative: storage.writeToss,
      writeWeb: storage.writeWeb,
    },
    writeFailureMessage: 'Failed to persist random event settings.',
  })

const runtimeRepository = createRandomEventSettingsRepository({
  isNative: hasNativeStorageBridge,
  readToss: () => readTossStorageJson(STORAGE_KEY, parseRandomEventSettings),
  readWeb: () => readWebStorageJson(STORAGE_KEY, parseRandomEventSettings),
  writeToss: (settings) => writeTossStorageJson(STORAGE_KEY, settings),
  writeWeb: (settings) => writeWebStorageJson(STORAGE_KEY, settings),
})

const preferenceStorage = createParsedPreferenceStorage({
  invalidMessage: 'Invalid random event settings.',
  parse: parseRandomEventSettings,
  read: () => runtimeRepository.read(),
  subscribe: webLocalStorage.subscribe,
  write: (settings) => runtimeRepository.write(settings).then(() => undefined),
})

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
