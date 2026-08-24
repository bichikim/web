import {z} from 'zod'

import {
  createLatestNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

const AUTO_START_STORAGE_KEY = 'pomo:timer-auto-start:v2'
const LEGACY_AUTO_START_STORAGE_KEY = 'pomo:timer-auto-start:v1'
const nativeWriter = createLatestNativeStorageWriter(AUTO_START_STORAGE_KEY)

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

const readWebPreference = () => {
  return (
    readWebStorageJson(AUTO_START_STORAGE_KEY, parsePreference) ??
    readWebStorageJson(LEGACY_AUTO_START_STORAGE_KEY, parseLegacyPreference)
  )
}

const readNativePreference = async () => {
  const preference = await readNativeStorageJson(AUTO_START_STORAGE_KEY, parsePreference)

  if (preference !== null) {
    return preference
  }

  return readNativeStorageJson(LEGACY_AUTO_START_STORAGE_KEY, parseLegacyPreference)
}

const writeWebPreference = (preference: StoredPreference) => {
  writeWebStorageJson(AUTO_START_STORAGE_KEY, preference)
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

/** Reads the latest auto-start preference saved by the app or browser runtime. */
export const readAutoStartPreference = async () => {
  const webPreference = readWebPreference()

  if (!hasNativeStorageBridge()) {
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

  if (!hasNativeStorageBridge()) {
    return
  }

  await nativeWriter.write(preference)
}
