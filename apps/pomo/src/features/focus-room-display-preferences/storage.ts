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

const DISPLAY_PREFERENCES_STORAGE_KEY = 'pomo:focus-room-display-preferences:v1'
const displayPreferencesSchema = z.object({
  dialogueComposerVisible: z.boolean(),
  memoryAssistVisible: z.boolean().default(true),
  playerVisible: z.boolean().default(true),
  pomodoroVisible: z.boolean().default(true),
  toolsButtonVisible: z.boolean().default(true),
  tourButtonVisible: z.boolean().default(true),
})

const parseDisplayPreferences = (value: unknown): PDisplayPreferences | null => {
  const result = displayPreferencesSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Creates the focus-room display preference policy over one storage boundary. */
export const createPDisplayPreferencesRepository = (
  options: CreatePDisplayPreferencesRepositoryOptions,
): PDisplayPreferencesRepository => {
  const {storage} = options
  let preferenceWriteRevision = 0
  let tossWriteQueue = Promise.resolve()

  const readWebPreferences = () =>
    parseDisplayPreferences(storage.readWeb(DISPLAY_PREFERENCES_STORAGE_KEY))

  const writeWebPreferences = (preferences: PDisplayPreferences) => {
    try {
      storage.writeWeb(DISPLAY_PREFERENCES_STORAGE_KEY, preferences)
      return null
    } catch (error: unknown) {
      return error
    }
  }

  const enqueueTossWrite = (preferences: PDisplayPreferences) => {
    const tossWrite = tossWriteQueue.then(() =>
      storage.writeToss(DISPLAY_PREFERENCES_STORAGE_KEY, preferences),
    )
    tossWriteQueue = tossWrite.catch(() => undefined)
    return tossWrite
  }

  const read = async (): Promise<PDisplayPreferences> => {
    const initialWriteRevision = preferenceWriteRevision

    if (!storage.usesTossStorage()) {
      return readWebPreferences() ?? DEFAULT_P_DISPLAY_PREFERENCES
    }

    try {
      await tossWriteQueue
      const tossPreferences = parseDisplayPreferences(
        await storage.readToss(DISPLAY_PREFERENCES_STORAGE_KEY),
      )

      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }

      const restoredPreferences = tossPreferences ?? DEFAULT_P_DISPLAY_PREFERENCES
      writeWebPreferences(restoredPreferences)
      return restoredPreferences
    } catch (error: unknown) {
      throw new Error('Failed to read focus-room display preferences.', {cause: error})
    }
  }

  const write = async (preferences: PDisplayPreferences): Promise<void> => {
    preferenceWriteRevision += 1
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
      await enqueueTossWrite(snapshot)
    } catch (error: unknown) {
      throw new Error('Failed to persist focus-room display preferences.', {cause: error})
    }
  }

  return {read, write}
}

const preserveStoredValue = (value: unknown) => value
const runtimeStorage = {
  readToss: (key: string) => readTossStorageJson(key, preserveStoredValue),
  readWeb: (key: string) => readWebStorageJson(key, preserveStoredValue),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: writeTossStorageJson,
  writeWeb(key: string, value: unknown) {
    const error = writeWebStorageJson(key, value)

    if (error !== null) {
      throw error
    }
  },
} satisfies PDisplayPreferencesStorage
const runtimeRepository = createPDisplayPreferencesRepository({storage: runtimeStorage})

/** Reads focus-room display preferences from storage for the current runtime. */
export const readPDisplayPreferences = () => runtimeRepository.read()

/** Persists focus-room display preferences until the host app or browser data is removed. */
export const writePDisplayPreferences = (preferences: PDisplayPreferences) =>
  runtimeRepository.write(preferences)
