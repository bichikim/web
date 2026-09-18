import {z} from 'zod'

import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

import {DEFAULT_P_DISPLAY_PREFERENCES, type PDisplayPreferences} from './model'

export interface PDisplayPreferencesStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown | null>
  readonly readWeb: (key: string) => unknown | null
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface PDisplayPreferencesRepository {
  readonly read: () => Promise<PDisplayPreferences>
  readonly write: (preferences: PDisplayPreferences) => Promise<void>
}

export interface CreatePDisplayPreferencesRepositoryOptions {
  readonly storage: PDisplayPreferencesStorage
}

export const DISPLAY_PREFERENCES_STORAGE_KEY = 'pomo:focus-room-display-preferences:v1'
const displayPreferencesSchema = z.object({
  dialogueComposerVisible: z.boolean(),
  featureRequestVisible: z.boolean().default(true),
  memoryAssistVisible: z.boolean().default(true),
  playerVisible: z.boolean().default(true),
  pomodoroVisible: z.boolean().default(true),
  toolsButtonVisible: z.boolean().default(true),
  tourButtonVisible: z.boolean().default(true),
})

export const parsePDisplayPreferences = (value: unknown): PDisplayPreferences | null => {
  const result = displayPreferencesSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Creates the focus-room display preference policy over one storage boundary. */
export const createPDisplayPreferencesRepository = (
  options: CreatePDisplayPreferencesRepositoryOptions,
): PDisplayPreferencesRepository => {
  const {storage} = options

  const readWebPreferences = () =>
    parsePDisplayPreferences(storage.readWeb(DISPLAY_PREFERENCES_STORAGE_KEY))

  const writeWebPreferences = (preferences: PDisplayPreferences) => {
    try {
      storage.writeWeb(DISPLAY_PREFERENCES_STORAGE_KEY, preferences)
      return null
    } catch (error: unknown) {
      return error
    }
  }

  const read = async (): Promise<PDisplayPreferences> => {
    if (!storage.usesTossStorage()) {
      return readWebPreferences() ?? DEFAULT_P_DISPLAY_PREFERENCES
    }

    try {
      const tossPreferences = parsePDisplayPreferences(
        await storage.readToss(DISPLAY_PREFERENCES_STORAGE_KEY),
      )

      const restoredPreferences = tossPreferences ?? DEFAULT_P_DISPLAY_PREFERENCES
      writeWebPreferences(restoredPreferences)
      return restoredPreferences
    } catch (error: unknown) {
      throw new Error('Failed to read focus-room display preferences.', {cause: error})
    }
  }

  const write = async (preferences: PDisplayPreferences): Promise<void> => {
    const snapshot = displayPreferencesSchema.parse(preferences)
    const webWriteError = writeWebPreferences(snapshot)

    if (!storage.usesTossStorage()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist focus-room display preferences.', {
          cause: webWriteError,
        })
      }

      return
    }

    try {
      await storage.writeToss(DISPLAY_PREFERENCES_STORAGE_KEY, snapshot)
    } catch (error: unknown) {
      throw new Error('Failed to persist focus-room display preferences.', {cause: error})
    }
  }

  return {read, write}
}

const runtimeRepository = createPDisplayPreferencesRepository({
  storage: {
    readToss: (key) => readTossStorageJson(key, (value) => value),
    readWeb: (key) => readWebStorageJson(key, (value) => value),
    usesTossStorage: hasNativeStorageBridge,
    writeToss: writeTossStorageJson,
    writeWeb(key, value) {
      const error = writeWebStorageJson(key, value)
      if (error !== null) {
        throw error
      }
    },
  },
})

/** Reads focus-room display preferences from storage for the current runtime. */
export const readPDisplayPreferences = () => runtimeRepository.read()

/** Persists focus-room display preferences until the host app or browser data is removed. */
export const writePDisplayPreferences = (preferences: PDisplayPreferences) =>
  runtimeRepository.write(preferences)
