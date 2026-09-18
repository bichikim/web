import {z} from 'zod'

import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

import {
  DEFAULT_DISPLAY_THEME,
  DISPLAY_THEME_STORAGE_KEY,
  type DisplayThemePreference,
} from './model'

export interface DisplayThemePreferenceStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown | null>
  readonly readWeb: (key: string) => unknown | null
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface DisplayThemePreferenceRepository {
  readonly read: () => Promise<DisplayThemePreference>
  readonly write: (preference: DisplayThemePreference) => Promise<void>
}

export interface CreateDisplayThemePreferenceRepositoryOptions {
  readonly storage: DisplayThemePreferenceStorage
}

const displayThemeSchema = z.enum(['bright', 'dark', 'system'])

export const parseDisplayThemePreference = (value: unknown): DisplayThemePreference | null => {
  const result = displayThemeSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Creates the display theme persistence policy over one storage boundary. */
export const createDisplayThemePreferenceRepository = (
  options: CreateDisplayThemePreferenceRepositoryOptions,
): DisplayThemePreferenceRepository => {
  const {storage} = options

  const readWebPreference = () =>
    parseDisplayThemePreference(storage.readWeb(DISPLAY_THEME_STORAGE_KEY))

  const writeWebPreference = (preference: DisplayThemePreference) => {
    try {
      storage.writeWeb(DISPLAY_THEME_STORAGE_KEY, preference)
      return null
    } catch (error: unknown) {
      return error
    }
  }

  const read = async (): Promise<DisplayThemePreference> => {
    const usesTossStorage = storage.usesTossStorage()

    if (!usesTossStorage) {
      return readWebPreference() ?? DEFAULT_DISPLAY_THEME
    }

    try {
      const webPreference = readWebPreference()

      if (webPreference !== null) {
        await storage.writeToss(DISPLAY_THEME_STORAGE_KEY, webPreference).catch(() => undefined)
        return webPreference
      }

      const tossPreference = parseDisplayThemePreference(
        await storage.readToss(DISPLAY_THEME_STORAGE_KEY),
      )

      const restoredPreference = tossPreference ?? DEFAULT_DISPLAY_THEME
      writeWebPreference(restoredPreference)
      return restoredPreference
    } catch (error: unknown) {
      throw new Error('Failed to read display theme preference.', {cause: error})
    }
  }

  const write = async (preference: DisplayThemePreference): Promise<void> => {
    const webWriteError = writeWebPreference(preference)

    if (!storage.usesTossStorage()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist display theme preference.', {cause: webWriteError})
      }

      return
    }

    try {
      await storage.writeToss(DISPLAY_THEME_STORAGE_KEY, preference)
    } catch (error: unknown) {
      throw new Error('Failed to persist display theme preference.', {cause: error})
    }
  }

  return {read, write}
}

const runtimeRepository = createDisplayThemePreferenceRepository({
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

/** Reads the display theme preference persisted for the current runtime. */
export const readDisplayThemePreference = () => runtimeRepository.read()

/** Persists the display theme preference until the host app or browser data is removed. */
export const writeDisplayThemePreference = (preference: DisplayThemePreference) =>
  runtimeRepository.write(preference)
