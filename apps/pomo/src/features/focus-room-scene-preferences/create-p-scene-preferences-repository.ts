import {createAuthoritativePreferenceRepository} from '../authoritative-preference'
import {z} from 'zod'
import {DEFAULT_P_SCENE_PREFERENCES, type PScenePreferences} from './model'

export const SCENE_PREFERENCES_STORAGE_KEY = 'pomo:focus-room-scene-preferences:v1'
const NATIVE_WRITE_FAILURE_STORAGE_KEY = 'pomo:focus-room-scene-preferences:native-write-failure:v1'
const scenePreferencesSchema = z.object({
  activity: z.enum(['reading', 'writing', 'typing']),
  gaze: z.enum(['focused', 'user']),
  timeMode: z.enum(['day', 'night', 'auto']),
})
export const parsePScenePreferences = (value: unknown): PScenePreferences | null => {
  const result = scenePreferencesSchema.safeParse(value)
  return result.success ? result.data : null
}

export interface PScenePreferencesStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown | null>
  readonly readWeb: (key: string) => unknown | null
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface PScenePreferencesRepository {
  readonly read: () => Promise<PScenePreferences>
  readonly write: (preferences: PScenePreferences) => Promise<void>
}

export interface CreatePScenePreferencesRepositoryOptions {
  readonly storage: PScenePreferencesStorage
}

/** Reads and writes scene preferences using the selected runtime storage. */
export const createPScenePreferencesRepository = (
  options: CreatePScenePreferencesRepositoryOptions,
): PScenePreferencesRepository => {
  const {storage} = options
  return createAuthoritativePreferenceRepository({
    defaultValue: DEFAULT_P_SCENE_PREFERENCES,
    nativeWriteFailure: {
      read: () => storage.readWeb(NATIVE_WRITE_FAILURE_STORAGE_KEY) === true,
      write: (failed) => {
        storage.writeWeb(NATIVE_WRITE_FAILURE_STORAGE_KEY, failed)
      },
    },
    readFailureMessage: 'Failed to read scene preferences.',
    softNativeWrite: true,
    storage: {
      isNative: storage.usesTossStorage,
      readNative: async () =>
        parsePScenePreferences(await storage.readToss(SCENE_PREFERENCES_STORAGE_KEY)),
      readWeb: () => parsePScenePreferences(storage.readWeb(SCENE_PREFERENCES_STORAGE_KEY)),
      writeNative: (value) => storage.writeToss(SCENE_PREFERENCES_STORAGE_KEY, value),
      writeWeb: (value) => {
        storage.writeWeb(SCENE_PREFERENCES_STORAGE_KEY, value)
        return null
      },
    },
    writeFailureMessage: 'Failed to persist scene preferences.',
  })
}
