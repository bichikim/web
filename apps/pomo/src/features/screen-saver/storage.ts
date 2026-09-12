import {z} from 'zod'

import {
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  removeWebStorageItem,
  writeNativeStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

import type {ScreenSaverDelay} from './model'

const SCREEN_SAVER_STORAGE_KEY = 'pomo:screen-saver-delay:v1'
const DEFAULT_SCREEN_SAVER_DELAY: ScreenSaverDelay = '10m'
const screenSaverDelaySchema = import.meta.env.DEV
  ? z.enum(['off', '5s', '1m', '10m', '20m', '1h'])
  : z.enum(['off', '1m', '10m', '20m', '1h'])
let preferenceWriteRevision = 0
let writeQueue = Promise.resolve()

const parseScreenSaverDelay = (value: unknown): ScreenSaverDelay | null => {
  const result = screenSaverDelaySchema.safeParse(value)
  return result.success ? result.data : null
}

const readWebPreference = (): ScreenSaverDelay | null => {
  return readWebStorageJson(SCREEN_SAVER_STORAGE_KEY, parseScreenSaverDelay)
}

const writeWebPreference = (delay: ScreenSaverDelay) => {
  return writeWebStorageJson(SCREEN_SAVER_STORAGE_KEY, delay)
}

/** Reads the screen saver delay from storage whose lifetime matches the current runtime. */
export const readScreenSaverDelay = async (): Promise<ScreenSaverDelay> => {
  const initialWriteRevision = preferenceWriteRevision
  await writeQueue
  if (preferenceWriteRevision !== initialWriteRevision) {
    return readScreenSaverDelay()
  }
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

    if (preferenceWriteRevision !== initialWriteRevision) {
      return readScreenSaverDelay()
    }

    if (nativePreference === null) {
      return DEFAULT_SCREEN_SAVER_DELAY
    }

    // Rebuild the authoritative web copy after an app update or browser-data eviction.
    writeWebPreference(nativePreference)
    return nativePreference
  } catch {
    if (preferenceWriteRevision !== initialWriteRevision) {
      return readScreenSaverDelay()
    }
    return DEFAULT_SCREEN_SAVER_DELAY
  }
}

const persistScreenSaverDelay = async (delay: ScreenSaverDelay): Promise<void> => {
  const webWriteError = writeWebPreference(delay)

  if (!hasNativeStorageBridge()) {
    if (webWriteError !== null) {
      throw new Error('Failed to persist screen saver delay.', {cause: webWriteError})
    }
    return
  }

  try {
    await writeNativeStorageJson(SCREEN_SAVER_STORAGE_KEY, delay)
  } catch (error: unknown) {
    if (webWriteError !== null) {
      throw new Error('Failed to persist screen saver delay.', {cause: error})
    }
    return
  }

  if (webWriteError !== null) {
    // Preserve the previous web preference unless its native replacement has persisted.
    const removalError = removeWebStorageItem(SCREEN_SAVER_STORAGE_KEY)
    if (removalError !== null) {
      throw new Error('Failed to persist screen saver delay.', {cause: removalError})
    }
  }
}

/** Persists the screen saver delay until the host app or browser data is removed. */
export const writeScreenSaverDelay = (delay: ScreenSaverDelay): Promise<void> => {
  preferenceWriteRevision += 1
  const write = writeQueue.then(() => persistScreenSaverDelay(delay))
  writeQueue = write.catch(() => undefined)
  return write
}
