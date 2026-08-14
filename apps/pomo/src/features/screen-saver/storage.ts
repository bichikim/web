// AI_NOTE - web-bridge 2.4.1's app client entry imports bridge-core without a runtime dependency,
// so package.json must keep both packages pinned to the same version.
import {Storage} from '@apps-in-toss/web-bridge'
import {z} from 'zod'

import type {ScreenSaverDelay} from './model'

const SCREEN_SAVER_STORAGE_KEY = 'pomo:screen-saver-delay:v1'
const DEFAULT_SCREEN_SAVER_DELAY: ScreenSaverDelay = '10m'
const screenSaverDelaySchema = z.enum(['off', '1m', '10m', '20m', '1h'])
let preferenceWriteRevision = 0
let nativeWriteQueue = Promise.resolve()

const parseScreenSaverDelay = (storedValue: string | null): ScreenSaverDelay | null => {
  if (storedValue === null) {
    return null
  }

  try {
    const result = screenSaverDelaySchema.safeParse(JSON.parse(storedValue) as unknown)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

const hasNativeBridge = () => 'ReactNativeWebView' in window

const readWebPreference = (): ScreenSaverDelay | null => {
  try {
    return parseScreenSaverDelay(localStorage.getItem(SCREEN_SAVER_STORAGE_KEY))
  } catch {
    return null
  }
}

const writeWebPreference = (delay: ScreenSaverDelay) => {
  try {
    localStorage.setItem(SCREEN_SAVER_STORAGE_KEY, JSON.stringify(delay))
  } catch {
    // Browser storage is best-effort; the in-memory preference remains usable for this session.
  }
}

const enqueueNativeWrite = (delay: ScreenSaverDelay) => {
  nativeWriteQueue = nativeWriteQueue.then(async () => {
    try {
      await Storage.setItem(SCREEN_SAVER_STORAGE_KEY, JSON.stringify(delay))
    } catch {
      // The authoritative web copy remains available when native storage is unavailable.
    }
  })

  return nativeWriteQueue
}

/** Reads the screen saver delay from storage whose lifetime matches the current runtime. */
export const readScreenSaverDelay = async (): Promise<ScreenSaverDelay> => {
  const initialWriteRevision = preferenceWriteRevision
  const webPreference = readWebPreference()

  if (webPreference !== null) {
    return webPreference
  }

  if (!hasNativeBridge()) {
    return DEFAULT_SCREEN_SAVER_DELAY
  }

  try {
    const nativePreference = parseScreenSaverDelay(await Storage.getItem(SCREEN_SAVER_STORAGE_KEY))

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
  // AI_NOTE - Keep web storage authoritative so a failed native write cannot revive a stale value.
  preferenceWriteRevision += 1
  writeWebPreference(delay)

  if (!hasNativeBridge()) {
    return
  }

  await enqueueNativeWrite(delay)
}
