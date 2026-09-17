import {withPromiseNull} from 'src/utils/with-promise-null'
import {z} from 'zod'
import {createLatestStorageWriter} from 'src/utils/runtime-storage/create-latest-storage-writer'
import {DEFAULT_P_SCENE_PREFERENCES, type PScenePreferences} from './model'

const SCENE_PREFERENCES_STORAGE_KEY = 'pomo:focus-room-scene-preferences:v1'
const scenePreferencesSchema = z.object({
  activity: z.enum(['reading', 'writing', 'typing']),
  gaze: z.enum(['focused', 'user']),
  timeMode: z.enum(['day', 'night', 'auto']),
})
const parseScenePreferences = (value: unknown): PScenePreferences | null => {
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

/** Creates scene preference coordination owned by one repository instance. */
export const createPScenePreferencesRepository = (
  options: CreatePScenePreferencesRepositoryOptions,
): PScenePreferencesRepository => {
  const {storage} = options
  let preferenceWriteRevision = 0
  const writeLatestToss = createLatestStorageWriter(SCENE_PREFERENCES_STORAGE_KEY, (key, value) =>
    storage.writeToss(key, value),
  )
  const readWebPreferences = () =>
    parseScenePreferences(storage.readWeb(SCENE_PREFERENCES_STORAGE_KEY))
  const writeWebPreferences = (preferences: PScenePreferences) => {
    storage.writeWeb(SCENE_PREFERENCES_STORAGE_KEY, preferences)
  }

  const read = async (): Promise<PScenePreferences> => {
    const initialWriteRevision = preferenceWriteRevision

    if (!storage.usesTossStorage()) {
      return readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
    }

    try {
      const tossPreferences = parseScenePreferences(
        await storage.readToss(SCENE_PREFERENCES_STORAGE_KEY),
      )
      if (preferenceWriteRevision !== initialWriteRevision) {
        return readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
      }

      const restoredPreferences = tossPreferences ?? DEFAULT_P_SCENE_PREFERENCES
      writeWebPreferences(restoredPreferences)
      return restoredPreferences
    } catch {
      return readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
    }
  }

  const write = async (preferences: PScenePreferences): Promise<void> => {
    preferenceWriteRevision += 1
    writeWebPreferences(preferences)
    if (!storage.usesTossStorage()) {
      return
    }
    await withPromiseNull(writeLatestToss(preferences))
  }

  return {read, write}
}
