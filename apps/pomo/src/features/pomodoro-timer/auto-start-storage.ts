// AI_NOTE - web-bridge 2.4.1's app client entry imports bridge-core without a runtime dependency,
// so package.json must keep both packages pinned to the same version.
import {Storage} from '@apps-in-toss/web-bridge'
import {z} from 'zod'

const AUTO_START_STORAGE_KEY = 'pomo:timer-auto-start:v1'
const autoStartSchema = z.boolean()

const parseAutoStart = (storedValue: string | null) => {
  if (storedValue === null) {
    return false
  }

  try {
    const result = autoStartSchema.safeParse(JSON.parse(storedValue) as unknown)
    return result.success ? result.data : false
  } catch {
    return false
  }
}

const hasNativeBridge = () => 'ReactNativeWebView' in window

const readWebPreference = () => {
  try {
    return parseAutoStart(localStorage.getItem(AUTO_START_STORAGE_KEY))
  } catch {
    return false
  }
}

const writeWebPreference = (isEnabled: boolean) => {
  try {
    localStorage.setItem(AUTO_START_STORAGE_KEY, JSON.stringify(isEnabled))
  } catch {
    // Browser storage is best-effort; the in-memory preference remains usable for this session.
  }
}

/** Reads the auto-start preference from storage whose lifetime matches the current runtime. */
export const readAutoStartPreference = async () => {
  const webPreference = readWebPreference()

  if (!hasNativeBridge()) {
    return webPreference
  }

  try {
    const storedValue = await Storage.getItem(AUTO_START_STORAGE_KEY)

    if (storedValue === null) {
      return webPreference
    }

    return parseAutoStart(storedValue)
  } catch {
    return webPreference
  }
}

/** Persists the auto-start preference until the host app or browser data is removed. */
export const writeAutoStartPreference = async (isEnabled: boolean) => {
  writeWebPreference(isEnabled)

  if (!hasNativeBridge()) {
    return
  }

  try {
    await Storage.setItem(AUTO_START_STORAGE_KEY, JSON.stringify(isEnabled))
  } catch {
    // Browser storage is best-effort; the in-memory preference remains usable for this session.
  }
}
