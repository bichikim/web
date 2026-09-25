import {z} from 'zod'

import {
  createVersionedPreferenceRepository,
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

export const MIN_DELAYED_END_EVENT_MINUTES = 1
export const MAX_DELAYED_END_EVENT_MINUTES = 120

export interface DelayedEndEventSettings {
  readonly durationMinutes: number
  readonly version: 1
}

export const DEFAULT_DELAYED_END_EVENT_SETTINGS = {
  durationMinutes: 30,
  version: 1,
} as const satisfies DelayedEndEventSettings

const STORAGE_KEY = 'pomo:delayed-end-event-settings:v1'
const delayedEndEventSettingsSchema: z.ZodType<DelayedEndEventSettings> = z.object({
  durationMinutes: z
    .number()
    .int()
    .min(MIN_DELAYED_END_EVENT_MINUTES)
    .max(MAX_DELAYED_END_EVENT_MINUTES),
  version: z.literal(1),
})

export const parseDelayedEndEventSettings = (value: unknown): DelayedEndEventSettings | null => {
  const result = delayedEndEventSettingsSchema.safeParse(value)
  return result.success ? result.data : null
}

export interface DelayedEndEventSettingsStorage {
  readonly isNative: () => boolean
  readonly readToss: () => Promise<DelayedEndEventSettings | null>
  readonly readWeb: () => DelayedEndEventSettings | null
  /** Returns null on success, or the storage error on failure. */
  readonly writeWeb: (settings: DelayedEndEventSettings) => unknown | null
  readonly writeToss: (settings: DelayedEndEventSettings) => Promise<void>
}

export interface DelayedEndEventSettingsRepository {
  readonly read: () => Promise<DelayedEndEventSettings>
  readonly write: (settings: DelayedEndEventSettings) => Promise<void>
}

export const createDelayedEndEventSettingsRepository = (
  storage: DelayedEndEventSettingsStorage,
): DelayedEndEventSettingsRepository =>
  createVersionedPreferenceRepository({
    defaultValue: DEFAULT_DELAYED_END_EVENT_SETTINGS,
    parse: (settings) => delayedEndEventSettingsSchema.parse(settings),
    storage: {
      isNative: storage.isNative,
      readNative: storage.readToss,
      readWeb: storage.readWeb,
      writeNative: storage.writeToss,
      writeWeb: storage.writeWeb,
    },
    writeFailureMessage: 'Failed to persist delayed end event settings.',
  })

const runtimeRepository = createDelayedEndEventSettingsRepository({
  isNative: hasNativeStorageBridge,
  readToss: () => readTossStorageJson(STORAGE_KEY, parseDelayedEndEventSettings),
  readWeb: () => readWebStorageJson(STORAGE_KEY, parseDelayedEndEventSettings),
  writeToss: (settings) => writeTossStorageJson(STORAGE_KEY, settings),
  writeWeb: (settings) => writeWebStorageJson(STORAGE_KEY, settings),
})

export const readDelayedEndEventSettings = (): Promise<DelayedEndEventSettings> =>
  runtimeRepository.read()

export const writeDelayedEndEventSettings = (settings: DelayedEndEventSettings): Promise<void> =>
  runtimeRepository.write(settings)
