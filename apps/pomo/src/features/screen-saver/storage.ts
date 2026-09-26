import {createTimestampedDualRuntimeStorage} from 'src/utils/runtime-storage/create-timestamped-dual-runtime-storage'
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
  const coordinator = createTimestampedDualRuntimeStorage<StoredScreenSaverPreference>({
    now,
    timestamp: 'monotonic',
  })
  let latestKnownPreference: StoredScreenSaverPreference | null = null
  const writeLatestToss = createLatestStorageWriter(SCREEN_SAVER_STORAGE_KEY, storage.writeToss)

  const readWebPreference = (): StoredScreenSaverPreference | null => {
    return parseStoredScreenSaverPreference(storage.readWeb(SCREEN_SAVER_STORAGE_KEY))
  }

  const writeWebPreference = (preference: StoredScreenSaverPreference) => {
    return storage.writeWeb(SCREEN_SAVER_STORAGE_KEY, preference)
  }

  const writeNativePreference = (preference: StoredScreenSaverPreference) =>
    coordinator.trackWrite(writeLatestToss(preference))

  const readWebFallback = (webPreference = readWebPreference()) => {
    const latestPreference = coordinator.selectLatest(latestKnownPreference, webPreference)
    latestKnownPreference = latestPreference
    coordinator.observeSavedAt(latestPreference?.savedAt ?? 0)
    return latestPreference?.delay ?? DEFAULT_SCREEN_SAVER_DELAY
  }

  const read = async (): Promise<ScreenSaverDelay> => {
    const initialWriteRevision = coordinator.revision()
    if (coordinator.hasPendingWrites()) {
      await coordinator.settleWrites()
      if (coordinator.revision() !== initialWriteRevision) {
        return read()
      }
    }

    const webPreference = readWebPreference()
    if (!storage.usesTossStorage()) {
      return readWebFallback(webPreference)
    }

    try {
      const tossPreference = parseStoredScreenSaverPreference(
        await storage.readToss(SCREEN_SAVER_STORAGE_KEY),
      )

      if (coordinator.revision() !== initialWriteRevision) {
        await coordinator.settleWrites()
        return read()
      }

      // Legacy string preferences have no timestamp, so preserve the native copy on a tie.
      const latestPreference = coordinator.selectLatest(tossPreference, webPreference)
      if (latestPreference === null) {
        return readWebFallback()
      }

      coordinator.observeSavedAt(webPreference?.savedAt ?? 0, tossPreference?.savedAt ?? 0)
      if (
        latestKnownPreference === null ||
        latestPreference.savedAt >= latestKnownPreference.savedAt
      ) {
        latestKnownPreference = latestPreference
      }

      if (latestPreference === webPreference) {
        await writeNativePreference(latestPreference).catch(() => undefined)
      } else {
        writeWebPreference(latestPreference)
      }

      if (coordinator.revision() !== initialWriteRevision) {
        await coordinator.settleWrites()
        return read()
      }

      return latestPreference.delay
    } catch {
      if (coordinator.revision() !== initialWriteRevision) {
        await coordinator.settleWrites()
        return read()
      }
      return readWebFallback()
    }
  }

  const persistScreenSaverDelay = async (
    preference: StoredScreenSaverPreference,
  ): Promise<void> => {
    const webWriteError = writeWebPreference(preference)

    if (!storage.usesTossStorage()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist screen saver delay.', {cause: webWriteError})
      }
      latestKnownPreference = preference
      return
    }

    try {
      await writeNativePreference(preference)
    } catch (error: unknown) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist screen saver delay.', {cause: error})
      }
      latestKnownPreference = preference
      return
    }

    latestKnownPreference = preference
    if (webWriteError !== null) {
      const currentWebPreference = readWebPreference()
      if (currentWebPreference !== null && currentWebPreference.savedAt > preference.savedAt) {
        latestKnownPreference = currentWebPreference
        return
      }

      const removalError = storage.removeWeb(SCREEN_SAVER_STORAGE_KEY)
      if (removalError !== null) {
        throw new Error('Failed to persist screen saver delay.', {cause: removalError})
      }
    }
  }

  const write = (delay: ScreenSaverDelay): Promise<void> =>
    coordinator.writeStored((savedAt) => ({delay, savedAt}), persistScreenSaverDelay)

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
