import {z} from 'zod'

import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

import {DISPLAY_THEME_STORAGE_KEY, type DisplayThemePreference} from './model'

const DEFAULT_DISPLAY_THEME: DisplayThemePreference = 'system'
const displayThemeSchema = z.enum(['bright', 'dark', 'system'])
const nativeWriter = createSerialNativeStorageWriter()
let preferenceWriteRevision = 0

const parseDisplayThemePreference = (value: unknown): DisplayThemePreference | null => {
  const result = displayThemeSchema.safeParse(value)
  return result.success ? result.data : null
}

const readWebPreference = () =>
  readWebStorageJson(DISPLAY_THEME_STORAGE_KEY, parseDisplayThemePreference)

const writeWebPreference = (preference: DisplayThemePreference) => {
  writeWebStorageJson(DISPLAY_THEME_STORAGE_KEY, preference)
}

/** Reads the display theme preference persisted for the current runtime. */
export const readDisplayThemePreference = async (): Promise<DisplayThemePreference> => {
  const initialWriteRevision = preferenceWriteRevision
  const webPreference = readWebPreference()

  if (webPreference !== null) {
    if (hasNativeStorageBridge()) {
      nativeWriter.write(DISPLAY_THEME_STORAGE_KEY, webPreference).catch(globalThis.reportError)
    }

    return webPreference
  }

  if (!hasNativeStorageBridge()) {
    return DEFAULT_DISPLAY_THEME
  }

  try {
    const nativePreference = await readNativeStorageJson(
      DISPLAY_THEME_STORAGE_KEY,
      parseDisplayThemePreference,
    )

    if (preferenceWriteRevision !== initialWriteRevision) {
      return readWebPreference() ?? DEFAULT_DISPLAY_THEME
    }

    if (nativePreference === null) {
      return DEFAULT_DISPLAY_THEME
    }

    writeWebPreference(nativePreference)
    return nativePreference
  } catch {
    return readWebPreference() ?? DEFAULT_DISPLAY_THEME
  }
}

/** Persists the display theme preference until the host app or browser data is removed. */
export const writeDisplayThemePreference = async (
  preference: DisplayThemePreference,
): Promise<void> => {
  preferenceWriteRevision += 1
  writeWebPreference(preference)

  if (!hasNativeStorageBridge()) {
    return
  }

  await nativeWriter.write(DISPLAY_THEME_STORAGE_KEY, preference)
}
