import {z} from 'zod'

import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

import {DEFAULT_P_SCENE_PREFERENCES, type PScenePreferences} from './model'

const SCENE_PREFERENCES_STORAGE_KEY = 'pomo:focus-room-scene-preferences:v1'
const scenePreferencesSchema = z.object({
  activity: z.enum(['reading', 'writing', 'typing']),
  gaze: z.enum(['focused', 'user']),
  timeMode: z.enum(['day', 'night', 'auto']),
})
let preferenceWriteRevision = 0
const nativeWriter = createSerialNativeStorageWriter()

const parseScenePreferences = (value: unknown): PScenePreferences | null => {
  const result = scenePreferencesSchema.safeParse(value)
  return result.success ? result.data : null
}

const readWebPreferences = (): PScenePreferences | null => {
  return readWebStorageJson(SCENE_PREFERENCES_STORAGE_KEY, parseScenePreferences)
}

const writeWebPreferences = (preferences: PScenePreferences) => {
  writeWebStorageJson(SCENE_PREFERENCES_STORAGE_KEY, preferences)
}

/** Reads scene preferences from storage whose lifetime matches the current runtime. */
export const readPScenePreferences = async (): Promise<PScenePreferences> => {
  const initialWriteRevision = preferenceWriteRevision
  const webPreferences = readWebPreferences()

  if (webPreferences !== null) {
    if (hasNativeStorageBridge()) {
      nativeWriter
        .write(SCENE_PREFERENCES_STORAGE_KEY, webPreferences)
        .catch(globalThis.reportError)
    }

    return webPreferences
  }

  if (!hasNativeStorageBridge()) {
    return DEFAULT_P_SCENE_PREFERENCES
  }

  try {
    const nativePreferences = await readNativeStorageJson(
      SCENE_PREFERENCES_STORAGE_KEY,
      parseScenePreferences,
    )

    if (preferenceWriteRevision !== initialWriteRevision) {
      return readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
    }

    if (nativePreferences === null) {
      return DEFAULT_P_SCENE_PREFERENCES
    }

    writeWebPreferences(nativePreferences)
    return nativePreferences
  } catch {
    return readWebPreferences() ?? DEFAULT_P_SCENE_PREFERENCES
  }
}

/** Persists scene preferences until the host app or browser data is removed. */
export const writePScenePreferences = async (preferences: PScenePreferences): Promise<void> => {
  preferenceWriteRevision += 1
  writeWebPreferences(preferences)

  if (!hasNativeStorageBridge()) {
    return
  }

  await nativeWriter.write(SCENE_PREFERENCES_STORAGE_KEY, preferences)
}
