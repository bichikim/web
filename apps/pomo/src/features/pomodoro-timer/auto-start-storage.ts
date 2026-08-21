import {Storage} from '@apps-in-toss/web-framework'
import {z} from 'zod'

const AUTO_START_STORAGE_KEY = 'pomo:timer-auto-start:v2'
const LEGACY_AUTO_START_STORAGE_KEY = 'pomo:timer-auto-start:v1'
let latestNativePreference: StoredPreference | null = null

const legacyPreferenceSchema = z.boolean()
const storedPreferenceSchema = z.object({
  isEnabled: z.boolean(),
  savedAt: z.number().finite().nonnegative(),
})

interface StoredPreference {
  readonly isEnabled: boolean
  readonly savedAt: number
}

const parsePreference = (storedValue: string | null): StoredPreference | null => {
  if (storedValue === null) {
    return null
  }

  try {
    const result = storedPreferenceSchema.safeParse(JSON.parse(storedValue) as unknown)

    return result.success ? result.data : null
  } catch {
    return null
  }
}

const parseLegacyPreference = (storedValue: string | null): StoredPreference | null => {
  if (storedValue === null) {
    return null
  }

  try {
    const result = legacyPreferenceSchema.safeParse(JSON.parse(storedValue) as unknown)
    return result.success ? {isEnabled: result.data, savedAt: 0} : null
  } catch {
    return null
  }
}

const hasNativeBridge = () => 'ReactNativeWebView' in window

const readWebPreference = () => {
  try {
    return (
      parsePreference(localStorage.getItem(AUTO_START_STORAGE_KEY)) ??
      parseLegacyPreference(localStorage.getItem(LEGACY_AUTO_START_STORAGE_KEY))
    )
  } catch {
    return null
  }
}

const readNativePreference = async () => {
  const preference = parsePreference(await Storage.getItem(AUTO_START_STORAGE_KEY))

  if (preference !== null) {
    return preference
  }

  return parseLegacyPreference(await Storage.getItem(LEGACY_AUTO_START_STORAGE_KEY))
}

const writeWebPreference = (preference: StoredPreference) => {
  try {
    localStorage.setItem(AUTO_START_STORAGE_KEY, JSON.stringify(preference))
  } catch {
    // Browser storage is best-effort; the in-memory preference remains usable for this session.
  }
}

const selectLatestPreference = (
  webPreference: StoredPreference | null,
  nativePreference: StoredPreference | null,
) => {
  if (webPreference === null) {
    return nativePreference
  }

  if (nativePreference === null || webPreference.savedAt >= nativePreference.savedAt) {
    return webPreference
  }

  return nativePreference
}

const setNativePreference = async (preference: StoredPreference) => {
  try {
    await Storage.setItem(AUTO_START_STORAGE_KEY, JSON.stringify(preference))
    return true
  } catch {
    // The synchronous web copy remains available when native storage is temporarily unavailable.
    return false
  }
}

const convergeNativePreference = async (preference: StoredPreference): Promise<void> => {
  if (!(await setNativePreference(preference))) {
    return
  }

  const latestPreference = latestNativePreference
  if (latestPreference !== preference && latestPreference !== null) {
    // An older request may finish last, so converge native storage back to the newest preference.
    await convergeNativePreference(latestPreference)
  }
}

const writeNativePreference = async (preference: StoredPreference) => {
  latestNativePreference = preference
  await convergeNativePreference(preference)
}

/** Reads the latest auto-start preference saved by the app or browser runtime. */
export const readAutoStartPreference = async () => {
  const webPreference = readWebPreference()

  if (!hasNativeBridge()) {
    return webPreference?.isEnabled ?? false
  }

  try {
    const nativePreference = await readNativePreference()
    return selectLatestPreference(webPreference, nativePreference)?.isEnabled ?? false
  } catch {
    return webPreference?.isEnabled ?? false
  }
}

/** Persists the auto-start preference until the host app or browser data is removed. */
export const writeAutoStartPreference = async (isEnabled: boolean) => {
  const preference = {isEnabled, savedAt: Date.now()} satisfies StoredPreference
  writeWebPreference(preference)

  if (!hasNativeBridge()) {
    return
  }

  await writeNativePreference(preference)
}
