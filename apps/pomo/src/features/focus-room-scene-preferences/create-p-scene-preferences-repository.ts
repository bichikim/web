import {z} from 'zod'
import {DEFAULT_P_SCENE_PREFERENCES, type PScenePreferences} from './model'

export const SCENE_PREFERENCES_STORAGE_KEY = 'pomo:focus-room-scene-preferences:v1'
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
  const readWebPreferences = () =>
    parsePScenePreferences(storage.readWeb(SCENE_PREFERENCES_STORAGE_KEY))
  const writeWebPreferences = (preferences: PScenePreferences) => {
    storage.writeWeb(SCENE_PREFERENCES_STORAGE_KEY, preferences)
  }

  const read = async (): Promise<PScenePreferences> => {
    if (!storage.usesTossStorage()) {
      return readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
    }

    try {
      const tossPreferences = parsePScenePreferences(
        await storage.readToss(SCENE_PREFERENCES_STORAGE_KEY),
      )

      const restoredPreferences =
        tossPreferences ?? readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
      writeWebPreferences(restoredPreferences)
      return restoredPreferences
    } catch {
      return readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
    }
  }

  const write = async (preferences: PScenePreferences): Promise<void> => {
    writeWebPreferences(preferences)
    if (!storage.usesTossStorage()) {
      return
    }
    try {
      await storage.writeToss(SCENE_PREFERENCES_STORAGE_KEY, preferences)
    } catch {}
  }

  return {read, write}
}
