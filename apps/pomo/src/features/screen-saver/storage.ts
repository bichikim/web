import {z} from 'zod'

import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  removeWebStorageItem,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

import type {ScreenSaverDelay} from './model'

const SCREEN_SAVER_STORAGE_KEY = 'pomo:screen-saver-delay:v1'
const DEFAULT_SCREEN_SAVER_DELAY: ScreenSaverDelay = '10m'
const screenSaverDelaySchema = import.meta.env.DEV
  ? z.enum(['off', '5s', '1m', '10m', '20m', '1h'])
  : z.enum(['off', '1m', '10m', '20m', '1h'])

const parseScreenSaverDelay = (value: unknown): ScreenSaverDelay | null => {
  const result = screenSaverDelaySchema.safeParse(value)
  return result.success ? result.data : null
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

/** Creates screen saver persistence with one independent write queue and storage boundary. */
export const createScreenSaverRepository = (storage: ScreenSaverStorage): ScreenSaverRepository => {
  let preferenceWriteRevision = 0
  let writeQueue = Promise.resolve()
  const readWebPreference = (): ScreenSaverDelay | null => {
    return parseScreenSaverDelay(storage.readWeb(SCREEN_SAVER_STORAGE_KEY))
  }

  const writeWebPreference = (delay: ScreenSaverDelay) => {
    return storage.writeWeb(SCREEN_SAVER_STORAGE_KEY, delay)
  }

  /** Reads the screen saver delay from storage whose lifetime matches the current runtime. */
  const read = async (): Promise<ScreenSaverDelay> => {
    const initialWriteRevision = preferenceWriteRevision
    await writeQueue
    if (preferenceWriteRevision !== initialWriteRevision) {
      return read()
    }
    const webPreference = readWebPreference()

    if (webPreference !== null) {
      return webPreference
    }

    if (!storage.usesTossStorage()) {
      return DEFAULT_SCREEN_SAVER_DELAY
    }

    try {
      const tossPreference = parseScreenSaverDelay(await storage.readToss(SCREEN_SAVER_STORAGE_KEY))

      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }

      if (tossPreference === null) {
        return DEFAULT_SCREEN_SAVER_DELAY
      }

      // Rebuild the authoritative web copy after an app update or browser-data eviction.
      writeWebPreference(tossPreference)
      return tossPreference
    } catch {
      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }
      return DEFAULT_SCREEN_SAVER_DELAY
    }
  }

  const persistScreenSaverDelay = async (delay: ScreenSaverDelay): Promise<void> => {
    const webWriteError = writeWebPreference(delay)

    if (!storage.usesTossStorage()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist screen saver delay.', {cause: webWriteError})
      }
      return
    }

    try {
      await storage.writeToss(SCREEN_SAVER_STORAGE_KEY, delay)
    } catch (error: unknown) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist screen saver delay.', {cause: error})
      }
      return
    }

    if (webWriteError !== null) {
      // Preserve the previous web preference unless its native replacement has persisted.
      const removalError = storage.removeWeb(SCREEN_SAVER_STORAGE_KEY)
      if (removalError !== null) {
        throw new Error('Failed to persist screen saver delay.', {cause: removalError})
      }
    }
  }

  /** Persists the screen saver delay until the host app or browser data is removed. */
  const write = (delay: ScreenSaverDelay): Promise<void> => {
    preferenceWriteRevision += 1
    const write = writeQueue.then(() => persistScreenSaverDelay(delay))
    writeQueue = write.catch(() => undefined)
    return write
  }

  return {read, write}
}

const preserveStoredValue = (value: unknown) => value
const runtimeRepository = createScreenSaverRepository({
  readToss: (key) => readTossStorageJson(key, preserveStoredValue),
  readWeb: (key) => readWebStorageJson(key, preserveStoredValue),
  removeWeb: removeWebStorageItem,
  usesTossStorage: hasNativeStorageBridge,
  writeToss: writeTossStorageJson,
  writeWeb: writeWebStorageJson,
})

/** Reads the screen saver delay persisted for the current runtime. */
export const readScreenSaverDelay = (): Promise<ScreenSaverDelay> => runtimeRepository.read()

/** Persists the screen saver delay until the host app or browser data is removed. */
export const writeScreenSaverDelay = (delay: ScreenSaverDelay): Promise<void> =>
  runtimeRepository.write(delay)
