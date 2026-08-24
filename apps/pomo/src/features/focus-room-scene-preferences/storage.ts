import {Storage} from '@apps-in-toss/web-framework'
import {z} from 'zod'

import {DEFAULT_P_SCENE_PREFERENCES, type PScenePreferences} from './model'

const SCENE_PREFERENCES_STORAGE_KEY = 'pomo:focus-room-scene-preferences:v1'
const scenePreferencesSchema = z.object({
  activity: z.enum(['reading', 'writing', 'typing']),
  gaze: z.enum(['focused', 'user']),
  timeMode: z.enum(['day', 'night', 'auto']),
})
let preferenceWriteRevision = 0
let nativeWriteQueue = Promise.resolve()

const parseScenePreferences = (storedValue: string | null): PScenePreferences | null => {
  if (storedValue === null) {
    return null
  }

  try {
    const result = scenePreferencesSchema.safeParse(JSON.parse(storedValue) as unknown)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

const hasNativeBridge = () => 'ReactNativeWebView' in window

const readWebPreferences = (): PScenePreferences | null => {
  try {
    return parseScenePreferences(localStorage.getItem(SCENE_PREFERENCES_STORAGE_KEY))
  } catch {
    return null
  }
}

const writeWebPreferences = (preferences: PScenePreferences) => {
  try {
    localStorage.setItem(SCENE_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    // Browser storage is best-effort; the in-memory preferences remain active for this session.
  }
}

const enqueueNativeWrite = (preferences: PScenePreferences) => {
  nativeWriteQueue = nativeWriteQueue.then(async () => {
    try {
      await Storage.setItem(SCENE_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // The authoritative web copy remains available when native storage is unavailable.
    }
  })

  return nativeWriteQueue
}

/** Reads scene preferences from storage whose lifetime matches the current runtime. */
export const readPScenePreferences = async (): Promise<PScenePreferences> => {
  const initialWriteRevision = preferenceWriteRevision
  const webPreferences = readWebPreferences()

  if (webPreferences !== null) {
    if (hasNativeBridge()) {
      enqueueNativeWrite(webPreferences).catch(globalThis.reportError)
    }

    return webPreferences
  }

  if (!hasNativeBridge()) {
    return DEFAULT_P_SCENE_PREFERENCES
  }

  try {
    const nativePreferences = parseScenePreferences(
      await Storage.getItem(SCENE_PREFERENCES_STORAGE_KEY),
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

  if (!hasNativeBridge()) {
    return
  }

  await enqueueNativeWrite(preferences)
}
