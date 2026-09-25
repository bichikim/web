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

import type {ScreenSaverDelay} from './model'

export const SCREEN_SAVER_STORAGE_KEY = 'pomo:screen-saver-delay:v1'
export const DEFAULT_SCREEN_SAVER_DELAY: ScreenSaverDelay = '10m'
const screenSaverDelaySchema = import.meta.env.DEV
  ? z.enum(['off', '5s', '1m', '10m', '20m', '1h'])
  : z.enum(['off', '1m', '10m', '20m', '1h'])
const storedScreenSaverPreferenceSchema = z.object({
  delay: screenSaverDelaySchema,
  savedAt: z.number().finite().nonnegative(),
})

interface StoredScreenSaverPreference {
  readonly delay: ScreenSaverDelay
  readonly savedAt: number
}

export const parseScreenSaverDelay = (value: unknown): ScreenSaverDelay | null => {
  const result = screenSaverDelaySchema.safeParse(value)
  return result.success ? result.data : null
}

const parseStoredScreenSaverPreference = (value: unknown): StoredScreenSaverPreference | null => {
  const result = storedScreenSaverPreferenceSchema.safeParse(value)
  if (result.success) {
    return result.data
  }

  const delay = parseScreenSaverDelay(value)
  return delay === null ? null : {delay, savedAt: 0}
}

export interface ScreenSaverStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown>
  readonly readWeb: (key: string) => unknown
  /** Returns the storage error on failure, or null on success. */
  readonly removeWeb: (key: string) => unknown | null
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  /** Returns the storage error on failure, or null on success. */
  readonly writeWeb: (key: string, value: unknown) => unknown | null
}

export interface ScreenSaverRepository {
  readonly read: () => Promise<ScreenSaverDelay>
  readonly write: (delay: ScreenSaverDelay) => Promise<void>
}

/** Reads and writes screen saver settings using the supplied runtime storage. */
export const createScreenSaverRepository = (
  storage: ScreenSaverStorage,
  now: () => number = Date.now,
): ScreenSaverRepository => {
  let writeRevision = 0
  let latestSavedAt = 0
  const pendingWrites = new Set<Promise<void>>()
  const writeLatestToss = createLatestStorageWriter(SCREEN_SAVER_STORAGE_KEY, storage.writeToss)

  const readWebPreference = (): StoredScreenSaverPreference | null => {
    return parseStoredScreenSaverPreference(storage.readWeb(SCREEN_SAVER_STORAGE_KEY))
  }

  const writeWebPreference = (preference: StoredScreenSaverPreference) => {
    return storage.writeWeb(SCREEN_SAVER_STORAGE_KEY, preference)
  }

  const createStoredPreference = (delay: ScreenSaverDelay): StoredScreenSaverPreference => {
    latestSavedAt = Math.max(now(), latestSavedAt + 1)
    return {delay, savedAt: latestSavedAt}
  }

  const writeNativePreference = (preference: StoredScreenSaverPreference) => {
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

  const readWebFallback = () => {
    const webPreference = readWebPreference()
    latestSavedAt = Math.max(latestSavedAt, webPreference?.savedAt ?? 0)
    return webPreference?.delay ?? DEFAULT_SCREEN_SAVER_DELAY
  }

  const read = async (): Promise<ScreenSaverDelay> => {
    const initialWriteRevision = writeRevision
    if (pendingWrites.size > 0) {
      await waitForPendingWrites()
      if (writeRevision !== initialWriteRevision) {
        return read()
      }
    }

    const webPreference = readWebPreference()
    if (!storage.usesTossStorage()) {
      latestSavedAt = Math.max(latestSavedAt, webPreference?.savedAt ?? 0)
      return webPreference?.delay ?? DEFAULT_SCREEN_SAVER_DELAY
    }

    try {
      const tossPreference = parseStoredScreenSaverPreference(
        await storage.readToss(SCREEN_SAVER_STORAGE_KEY),
      )

      if (writeRevision !== initialWriteRevision) {
        await waitForPendingWrites()
        return read()
      }

      // Legacy string preferences have no timestamp, so preserve the native copy on a tie.
      const latestPreference = selectMaximumBy(
        tossPreference,
        webPreference,
        (value) => value.savedAt,
      )
      if (latestPreference === null) {
        return DEFAULT_SCREEN_SAVER_DELAY
      }

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

      return latestPreference.delay
    } catch {
      if (writeRevision !== initialWriteRevision) {
        await waitForPendingWrites()
        return read()
      }
      return readWebFallback()
    }
  }

  const persistScreenSaverDelay = async (delay: ScreenSaverDelay): Promise<void> => {
    const preference = createStoredPreference(delay)
    const webWriteError = writeWebPreference(preference)

    if (!storage.usesTossStorage()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist screen saver delay.', {cause: webWriteError})
      }
      return
    }

    try {
      await writeNativePreference(preference)
    } catch (error: unknown) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist screen saver delay.', {cause: error})
      }
      return
    }

    if (webWriteError !== null) {
      const currentWebPreference = readWebPreference()
      if (currentWebPreference !== null && currentWebPreference.savedAt > preference.savedAt) {
        return
      }

      const removalError = storage.removeWeb(SCREEN_SAVER_STORAGE_KEY)
      if (removalError !== null) {
        throw new Error('Failed to persist screen saver delay.', {cause: removalError})
      }
    }
  }

  const write = (delay: ScreenSaverDelay): Promise<void> => {
    writeRevision += 1
    const pendingWrite = persistScreenSaverDelay(delay)
    pendingWrites.add(pendingWrite)
    pendingWrite.finally(() => pendingWrites.delete(pendingWrite)).catch(() => undefined)
    return pendingWrite
  }

  return {read, write}
}

const runtimeRepository = createScreenSaverRepository(
  {
    readToss: (key) => readTossStorageJson(key, (value) => value),
    readWeb: (key) => readWebStorageJson(key, (value) => value),
    removeWeb: removeWebStorageItem,
    usesTossStorage: hasNativeStorageBridge,
    writeToss: writeTossStorageJson,
    writeWeb: writeWebStorageJson,
  },
  Date.now,
)

/** Reads the screen saver delay persisted for the current runtime. */
export const readScreenSaverDelay = (): Promise<ScreenSaverDelay> => runtimeRepository.read()

/** Persists the screen saver delay until the host app or browser data is removed. */
export const writeScreenSaverDelay = (delay: ScreenSaverDelay): Promise<void> =>
  runtimeRepository.write(delay)
