import {createTimestampedDualRuntimeStorage} from 'src/utils/runtime-storage/create-timestamped-dual-runtime-storage'
import {z} from 'zod'

import {
  createLatestStorageWriter,
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

const AUTO_START_STORAGE_KEY = 'pomo:timer-auto-start:v2'
const LEGACY_AUTO_START_STORAGE_KEY = 'pomo:timer-auto-start:v1'

const legacyPreferenceSchema = z.boolean()
const storedPreferenceSchema = z.object({
  isEnabled: z.boolean(),
  savedAt: z.number().finite().nonnegative(),
})

interface StoredPreference {
  readonly isEnabled: boolean
  readonly savedAt: number
}

const parsePreference = (value: unknown): StoredPreference | null => {
  const result = storedPreferenceSchema.safeParse(value)
  return result.success ? result.data : null
}

const parseLegacyPreference = (value: unknown): StoredPreference | null => {
  const result = legacyPreferenceSchema.safeParse(value)
  return result.success ? {isEnabled: result.data, savedAt: 0} : null
}

export interface AutoStartStorage {
  read(): Promise<boolean>
  write(isEnabled: boolean): Promise<void>
}

export interface AutoStartStorageAdapter {
  readonly usesTossStorage: typeof hasNativeStorageBridge
  readonly readWeb: typeof readWebStorageJson
  readonly readToss: typeof readTossStorageJson
  readonly writeWeb: typeof writeWebStorageJson
  readonly writeToss: typeof writeTossStorageJson
}

interface AutoStartStorageOptions {
  readonly storage: AutoStartStorageAdapter
  readonly now: () => number
}

/** Reads and writes auto-start preferences, including the legacy format. */
export const createAutoStartStorage = ({
  storage,
  now,
}: AutoStartStorageOptions): AutoStartStorage => {
  const coordinator = createTimestampedDualRuntimeStorage<StoredPreference>({now})
  const writeLatestToss = createLatestStorageWriter(AUTO_START_STORAGE_KEY, storage.writeToss)

  const readWebPreference = () => {
    return (
      storage.readWeb(AUTO_START_STORAGE_KEY, parsePreference) ??
      storage.readWeb(LEGACY_AUTO_START_STORAGE_KEY, parseLegacyPreference)
    )
  }

  const readTossPreference = async () => {
    const preference = await storage.readToss(AUTO_START_STORAGE_KEY, parsePreference)

    if (preference !== null) {
      return preference
    }

    return storage.readToss(LEGACY_AUTO_START_STORAGE_KEY, parseLegacyPreference)
  }

  const writeWebPreference = (preference: StoredPreference) => {
    return storage.writeWeb(AUTO_START_STORAGE_KEY, preference)
  }

  /** Reads the latest auto-start preference saved by the app or browser runtime. */
  const read = async () => {
    const webPreference = readWebPreference()

    if (!storage.usesTossStorage()) {
      return webPreference?.isEnabled ?? false
    }

    try {
      const tossPreference = await readTossPreference()

      const currentWebPreference = readWebPreference()
      const latestPreference = coordinator.selectLatest(currentWebPreference, tossPreference)

      if (latestPreference !== null) {
        if (latestPreference === currentWebPreference) {
          await writeLatestToss(latestPreference).catch(() => undefined)
        } else {
          writeWebPreference(latestPreference)
        }
      }

      return latestPreference?.isEnabled ?? false
    } catch {
      return readWebPreference()?.isEnabled ?? false
    }
  }

  /** Persists the auto-start preference until the host app or browser data is removed. */
  const persistPreference = async (preference: StoredPreference) => {
    const webWriteError = writeWebPreference(preference)

    if (!storage.usesTossStorage()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist auto-start preference.', {cause: webWriteError})
      }

      return
    }

    try {
      await writeLatestToss(preference)
    } catch (error: unknown) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist auto-start preference.', {cause: error})
      }
    }
  }

  const write = (isEnabled: boolean) =>
    coordinator.writeStored((savedAt) => ({isEnabled, savedAt}), persistPreference)

  return {read, write}
}

const runtimeStorage = createAutoStartStorage({
  now: () => Date.now(),
  storage: {
    readToss: readTossStorageJson,
    readWeb: readWebStorageJson,
    usesTossStorage: hasNativeStorageBridge,
    writeToss: writeTossStorageJson,
    writeWeb: writeWebStorageJson,
  },
})

export const readAutoStartPreference = runtimeStorage.read
export const writeAutoStartPreference = runtimeStorage.write
