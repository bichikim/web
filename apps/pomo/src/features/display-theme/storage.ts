import {selectMaximumBy} from 'src/utils/select-maximum-by'
import {z} from 'zod'

import {
  createLatestStorageWriter,
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  removeWebStorageItem,
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
  readonly removeWeb: (key: string) => unknown | null
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface DisplayThemePreferenceRepository {
  readonly read: () => Promise<DisplayThemePreference>
  readonly write: (preference: DisplayThemePreference) => Promise<void>
}

export interface CreateDisplayThemePreferenceRepositoryOptions {
  readonly storage: DisplayThemePreferenceStorage
  readonly now?: () => number
}

const displayThemeSchema = z.enum(['bright', 'dark', 'system'])
const storedDisplayThemePreferenceSchema = z.object({
  preference: displayThemeSchema,
  savedAt: z.number().finite().nonnegative(),
})

interface StoredDisplayThemePreference {
  readonly preference: DisplayThemePreference
  readonly savedAt: number
}

const selectLatestStoredPreference = (
  first: StoredDisplayThemePreference | null,
  second: StoredDisplayThemePreference | null,
) => selectMaximumBy(first, second, (value) => value.savedAt)

export const parseDisplayThemePreference = (value: unknown): DisplayThemePreference | null => {
  const result = displayThemeSchema.safeParse(value)
  return result.success ? result.data : null
}

const parseStoredDisplayThemePreference = (value: unknown): StoredDisplayThemePreference | null => {
  const result = storedDisplayThemePreferenceSchema.safeParse(value)
  if (result.success) {
    return result.data
  }

  const preference = parseDisplayThemePreference(value)
  return preference === null ? null : {preference, savedAt: 0}
}

/** Creates the display theme persistence policy over one storage boundary. */
export const createDisplayThemePreferenceRepository = (
  options: CreateDisplayThemePreferenceRepositoryOptions,
): DisplayThemePreferenceRepository => {
  const {storage} = options
  const now = options.now ?? Date.now
  let writeRevision = 0
  let latestSavedAt = 0
  let latestKnownPreference: StoredDisplayThemePreference | null = null
  const pendingWrites = new Set<Promise<void>>()
  const writeLatestToss = createLatestStorageWriter(DISPLAY_THEME_STORAGE_KEY, storage.writeToss)

  const readWebPreference = () =>
    parseStoredDisplayThemePreference(storage.readWeb(DISPLAY_THEME_STORAGE_KEY))

  const writeWebPreference = (preference: StoredDisplayThemePreference) => {
    try {
      storage.writeWeb(DISPLAY_THEME_STORAGE_KEY, preference)
      return null
    } catch (error: unknown) {
      return error
    }
  }

  const createStoredPreference = (
    preference: DisplayThemePreference,
  ): StoredDisplayThemePreference => {
    latestSavedAt = Math.max(now(), latestSavedAt + 1)
    return {preference, savedAt: latestSavedAt}
  }

  const writeNativePreference = (preference: StoredDisplayThemePreference) => {
    const pendingWrite = writeLatestToss(preference)
    pendingWrites.add(pendingWrite)
    pendingWrite.finally(() => pendingWrites.delete(pendingWrite)).catch(() => undefined)
    return pendingWrite
  }

  const waitForPendingWrites = async () => {
    await Promise.all(
      Array.from(pendingWrites, (pendingWrite) => pendingWrite.catch(() => undefined)),
    )
  }

  const persistPreference = async (preference: StoredDisplayThemePreference): Promise<void> => {
    const webWriteError = writeWebPreference(preference)
    if (!storage.usesTossStorage()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist display theme preference.', {cause: webWriteError})
      }
      return
    }

    try {
      await writeNativePreference(preference)
    } catch (error: unknown) {
      throw new Error('Failed to persist display theme preference.', {cause: error})
    }

    if (webWriteError !== null) {
      const currentWebPreference = readWebPreference()
      if (currentWebPreference !== null && currentWebPreference.savedAt > preference.savedAt) {
        return
      }

      const removalError = storage.removeWeb(DISPLAY_THEME_STORAGE_KEY)
      if (removalError !== null) {
        throw new Error('Failed to persist display theme preference.', {cause: removalError})
      }
    }
  }

  const write = (preference: DisplayThemePreference): Promise<void> => {
    writeRevision += 1
    const pendingWrite = persistPreference(createStoredPreference(preference))
    pendingWrites.add(pendingWrite)
    pendingWrite.finally(() => pendingWrites.delete(pendingWrite)).catch(() => undefined)
    return pendingWrite
  }

  const readWebFallback = (error: unknown): DisplayThemePreference => {
    let webPreference: StoredDisplayThemePreference | null = null
    try {
      webPreference = readWebPreference()
    } catch {
      webPreference = null
    }
    if (webPreference !== null) {
      latestSavedAt = Math.max(latestSavedAt, webPreference.savedAt)
      return webPreference.preference
    }
    throw new Error('Failed to read display theme preference.', {cause: error})
  }

  const read = async (): Promise<DisplayThemePreference> => {
    const initialWriteRevision = writeRevision
    const usesTossStorage = storage.usesTossStorage()

    if (!usesTossStorage) {
      const webPreference = readWebPreference()
      const latestPreference = selectLatestStoredPreference(latestKnownPreference, webPreference)
      latestKnownPreference = latestPreference
      latestSavedAt = Math.max(latestSavedAt, latestPreference?.savedAt ?? 0)
      return latestPreference?.preference ?? DEFAULT_DISPLAY_THEME
    }

    try {
      const webPreference = readWebPreference()
      if (webPreference === null && pendingWrites.size > 0) {
        await waitForPendingWrites()
        if (writeRevision !== initialWriteRevision) {
          return read()
        }
      }

      const tossPreference = parseStoredDisplayThemePreference(
        await storage.readToss(DISPLAY_THEME_STORAGE_KEY),
      )

      if (writeRevision !== initialWriteRevision) {
        await waitForPendingWrites()
        return read()
      }

      // Legacy string preferences have no timestamp, so preserve the native copy on a tie.
      const latestPreference = selectLatestStoredPreference(tossPreference, webPreference)

      if (latestPreference === null) {
        writeWebPreference({preference: DEFAULT_DISPLAY_THEME, savedAt: 0})
        return DEFAULT_DISPLAY_THEME
      }

      latestKnownPreference = selectLatestStoredPreference(latestPreference, latestKnownPreference)

      latestSavedAt = Math.max(
        latestSavedAt,
        webPreference?.savedAt ?? 0,
        tossPreference?.savedAt ?? 0,
      )

      if (latestPreference === webPreference) {
        await writeNativePreference(latestPreference).catch(() => undefined)
      } else {
        writeWebPreference(latestPreference)
      }

      if (writeRevision !== initialWriteRevision) {
        await waitForPendingWrites()
        return read()
      }

      return latestPreference.preference
    } catch (error: unknown) {
      if (writeRevision !== initialWriteRevision) {
        await waitForPendingWrites()
        return read()
      }
      return readWebFallback(error)
    }
  }

  return {read, write}
}

const runtimeRepository = createDisplayThemePreferenceRepository({
  now: Date.now,
  storage: {
    readToss: (key) => readTossStorageJson(key, (value) => value),
    readWeb: (key) => readWebStorageJson(key, (value) => value),
    removeWeb: removeWebStorageItem,
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
