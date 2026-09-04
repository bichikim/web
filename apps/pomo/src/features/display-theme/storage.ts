import {z} from 'zod'

import {
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeNativeStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

import {DISPLAY_THEME_STORAGE_KEY, type DisplayThemePreference} from './model'

export interface DisplayThemePreferenceStorage {
  readonly isNative: () => boolean
  readonly readNative: (key: string) => Promise<unknown | null>
  readonly readWeb: (key: string) => unknown | null
  readonly writeNative: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface DisplayThemePreferenceRepository {
  readonly read: () => Promise<DisplayThemePreference>
  readonly write: (preference: DisplayThemePreference) => Promise<void>
}

export interface CreateDisplayThemePreferenceRepositoryOptions {
  readonly storage: DisplayThemePreferenceStorage
}

const DEFAULT_DISPLAY_THEME: DisplayThemePreference = 'system'
const displayThemeSchema = z.enum(['bright', 'dark', 'system'])

const parseDisplayThemePreference = (value: unknown): DisplayThemePreference | null => {
  const result = displayThemeSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Creates the display theme persistence policy over one storage boundary. */
export const createDisplayThemePreferenceRepository = (
  options: CreateDisplayThemePreferenceRepositoryOptions,
): DisplayThemePreferenceRepository => {
  const {storage} = options
  let preferenceWriteRevision = 0
  let nativeWriteQueue = Promise.resolve()

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

  const enqueueNativeWrite = (preference: DisplayThemePreference) => {
    const nativeWrite = nativeWriteQueue.then(() =>
      storage.writeNative(DISPLAY_THEME_STORAGE_KEY, preference),
    )
    nativeWriteQueue = nativeWrite.catch(() => undefined)
    return nativeWrite
  }

  const read = async (): Promise<DisplayThemePreference> => {
    const initialWriteRevision = preferenceWriteRevision

    if (!storage.isNative()) {
      return readWebPreference() ?? DEFAULT_DISPLAY_THEME
    }

    try {
      await nativeWriteQueue
      const nativePreference = parseDisplayThemePreference(
        await storage.readNative(DISPLAY_THEME_STORAGE_KEY),
      )

      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }

      const restoredPreference = nativePreference ?? DEFAULT_DISPLAY_THEME
      writeWebPreference(restoredPreference)
      return restoredPreference
    } catch (error: unknown) {
      throw new Error('Failed to read display theme preference.', {cause: error})
    }
  }

  const write = async (preference: DisplayThemePreference): Promise<void> => {
    preferenceWriteRevision += 1
    const webWriteError = writeWebPreference(preference)

    if (!storage.isNative()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist display theme preference.', {cause: webWriteError})
      }

      return
    }

    try {
      await enqueueNativeWrite(preference)
    } catch (error: unknown) {
      throw new Error('Failed to persist display theme preference.', {cause: error})
    }
  }

  return {read, write}
}

const preserveStoredValue = (value: unknown) => value
const runtimeStorage = {
  isNative: hasNativeStorageBridge,
  readNative: (key: string) => readNativeStorageJson(key, preserveStoredValue),
  readWeb: (key: string) => readWebStorageJson(key, preserveStoredValue),
  writeNative: writeNativeStorageJson,
  writeWeb(key: string, value: unknown) {
    const error = writeWebStorageJson(key, value)

    if (error !== null) {
      throw error
    }
  },
} satisfies DisplayThemePreferenceStorage
const runtimeRepository = createDisplayThemePreferenceRepository({storage: runtimeStorage})

/** Reads the display theme preference persisted for the current runtime. */
export const readDisplayThemePreference = () => runtimeRepository.read()

/** Persists the display theme preference until the host app or browser data is removed. */
export const writeDisplayThemePreference = (preference: DisplayThemePreference) =>
  runtimeRepository.write(preference)
