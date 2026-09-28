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
  let writeRevision = 0
  let pendingNativeWriteCount = 0
  const readWebPreferences = () =>
    parsePScenePreferences(storage.readWeb(SCENE_PREFERENCES_STORAGE_KEY))
  const writeWebPreferences = (preferences: PScenePreferences) => {
    storage.writeWeb(SCENE_PREFERENCES_STORAGE_KEY, preferences)
  }
  const readWebPreferencesSafely = () => {
    try {
      return readWebPreferences()
    } catch {
      return null
    }
  }
  const readNativeWriteFailure = () => {
    try {
      return storage.readWeb(NATIVE_WRITE_FAILURE_STORAGE_KEY) === true
    } catch {
      return false
    }
  }
  const setNativeWriteFailure = (failed: boolean) => {
    try {
      storage.writeWeb(NATIVE_WRITE_FAILURE_STORAGE_KEY, failed)
    } catch {}
  }

  const read = async (): Promise<PScenePreferences> => {
    const initialWriteRevision = writeRevision

    if (!storage.usesTossStorage()) {
      return readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
    }

    if (pendingNativeWriteCount > 0) {
      return readWebPreferencesSafely() ?? DEFAULT_P_SCENE_PREFERENCES
    }

    const webPreferences = readWebPreferencesSafely()
    if (webPreferences !== null && readNativeWriteFailure()) {
      return webPreferences
    }

    try {
      const storedPreferences = await storage.readToss(SCENE_PREFERENCES_STORAGE_KEY)
      if (writeRevision !== initialWriteRevision) {
        return readWebPreferencesSafely() ?? DEFAULT_P_SCENE_PREFERENCES
      }

      const tossPreferences = parsePScenePreferences(storedPreferences)

      const latestWebPreferences = readWebPreferencesSafely()
      if (latestWebPreferences !== null && readNativeWriteFailure()) {
        return latestWebPreferences
      }

      const restoredPreferences =
        tossPreferences ?? latestWebPreferences ?? DEFAULT_P_SCENE_PREFERENCES
      if (tossPreferences !== null) {
        setNativeWriteFailure(false)
      }
      writeWebPreferences(restoredPreferences)
      return restoredPreferences
    } catch {
      if (writeRevision !== initialWriteRevision) {
        return readWebPreferencesSafely() ?? DEFAULT_P_SCENE_PREFERENCES
      }

      return readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
    }
  }

  const write = async (preferences: PScenePreferences): Promise<void> => {
    writeWebPreferences(preferences)
    writeRevision += 1
    const currentWriteRevision = writeRevision
    if (!storage.usesTossStorage()) {
      setNativeWriteFailure(false)
      return
    }

    pendingNativeWriteCount += 1
    try {
      await storage.writeToss(SCENE_PREFERENCES_STORAGE_KEY, preferences)
      if (writeRevision === currentWriteRevision) {
        setNativeWriteFailure(false)
      }
    } catch {
      if (writeRevision === currentWriteRevision) {
        setNativeWriteFailure(true)
      }
    } finally {
      pendingNativeWriteCount -= 1
    }
  }

  return {read, write}
}
