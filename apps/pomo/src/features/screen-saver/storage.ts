import {z} from 'zod'

import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

import type {ScreenSaverDelay} from './model'

const SCREEN_SAVER_STORAGE_KEY = 'pomo:screen-saver-delay:v1'
const DEFAULT_SCREEN_SAVER_DELAY: ScreenSaverDelay = '10m'
const screenSaverDelaySchema = z.enum(['off', '1m', '10m', '20m', '1h'])
let preferenceWriteRevision = 0
const nativeWriter = createSerialNativeStorageWriter()

const parseScreenSaverDelay = (value: unknown): ScreenSaverDelay | null => {
  const result = screenSaverDelaySchema.safeParse(value)
  return result.success ? result.data : null
}

const readWebPreference = (): ScreenSaverDelay | null => {
  return readWebStorageJson(SCREEN_SAVER_STORAGE_KEY, parseScreenSaverDelay)
}

const writeWebPreference = (delay: ScreenSaverDelay) => {
  writeWebStorageJson(SCREEN_SAVER_STORAGE_KEY, delay)
}

/** Reads the screen saver delay from storage whose lifetime matches the current runtime. */
export const readScreenSaverDelay = async (): Promise<ScreenSaverDelay> => {
  const initialWriteRevision = preferenceWriteRevision
  const webPreference = readWebPreference()

  if (webPreference !== null) {
    return webPreference
  }

  if (!hasNativeStorageBridge()) {
    return DEFAULT_SCREEN_SAVER_DELAY
  }

  try {
    const nativePreference = await readNativeStorageJson(
      SCREEN_SAVER_STORAGE_KEY,
      parseScreenSaverDelay,
    )

    if (nativePreference === null) {
      return DEFAULT_SCREEN_SAVER_DELAY
    }

    if (preferenceWriteRevision === initialWriteRevision) {
      // Rebuild the authoritative web copy after an app update or browser-data eviction.
      writeWebPreference(nativePreference)
    }
    return nativePreference
  } catch {
    return DEFAULT_SCREEN_SAVER_DELAY
  }
}

/** Persists the screen saver delay until the host app or browser data is removed. */
export const writeScreenSaverDelay = async (delay: ScreenSaverDelay): Promise<void> => {
  // Keep web storage authoritative so a failed native write cannot revive a stale value.
  preferenceWriteRevision += 1
  writeWebPreference(delay)

  if (!hasNativeStorageBridge()) {
    return
  }

  await nativeWriter.write(SCREEN_SAVER_STORAGE_KEY, delay)
}
