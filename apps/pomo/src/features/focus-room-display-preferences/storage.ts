import {z} from 'zod'

import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

import {DEFAULT_P_DISPLAY_PREFERENCES, type PDisplayPreferences} from './model'

const DISPLAY_PREFERENCES_STORAGE_KEY = 'pomo:focus-room-display-preferences:v1'
const displayPreferencesSchema = z.object({dialogueComposerVisible: z.boolean()})
const nativeWriter = createSerialNativeStorageWriter()
let preferenceWriteRevision = 0

const parseDisplayPreferences = (value: unknown): PDisplayPreferences | null => {
  const result = displayPreferencesSchema.safeParse(value)
  return result.success ? result.data : null
}

const readWebPreferences = (): PDisplayPreferences | null =>
  readWebStorageJson(DISPLAY_PREFERENCES_STORAGE_KEY, parseDisplayPreferences)

const writeWebPreferences = (preferences: PDisplayPreferences) => {
  writeWebStorageJson(DISPLAY_PREFERENCES_STORAGE_KEY, preferences)
}

/** Reads focus-room display preferences from storage for the current runtime. */
export const readPDisplayPreferences = async (): Promise<PDisplayPreferences> => {
  const initialWriteRevision = preferenceWriteRevision
  const webPreferences = readWebPreferences()

  if (webPreferences !== null) {
    if (hasNativeStorageBridge()) {
      nativeWriter
        .write(DISPLAY_PREFERENCES_STORAGE_KEY, webPreferences)
        .catch(globalThis.reportError)
    }

    return webPreferences
  }

  if (!hasNativeStorageBridge()) {
    return DEFAULT_P_DISPLAY_PREFERENCES
  }

  try {
    const nativePreferences = await readNativeStorageJson(
      DISPLAY_PREFERENCES_STORAGE_KEY,
      parseDisplayPreferences,
    )

    if (preferenceWriteRevision !== initialWriteRevision) {
      return readWebPreferences() ?? DEFAULT_P_DISPLAY_PREFERENCES
    }

    if (nativePreferences === null) {
      return DEFAULT_P_DISPLAY_PREFERENCES
    }

    writeWebPreferences(nativePreferences)
    return nativePreferences
  } catch {
    return readWebPreferences() ?? DEFAULT_P_DISPLAY_PREFERENCES
  }
}

/** Persists focus-room display preferences until the host app or browser data is removed. */
export const writePDisplayPreferences = async (preferences: PDisplayPreferences): Promise<void> => {
  preferenceWriteRevision += 1
  const snapshot = displayPreferencesSchema.parse(preferences)
  writeWebPreferences(snapshot)

  if (!hasNativeStorageBridge()) {
    return
  }

  await nativeWriter.write(DISPLAY_PREFERENCES_STORAGE_KEY, snapshot)
}
