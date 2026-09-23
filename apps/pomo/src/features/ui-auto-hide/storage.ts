import {z} from 'zod'
import {createLatestAsyncTask} from 'src/utils/create-latest-async-task'
import type {PreferenceStorage} from 'src/utils/preference-storage'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

const MIN_SECONDS = 5
const MAX_SECONDS = 3600
const STORAGE_KEY = 'pomo:ui-auto-hide:v1'
const preferencesSchema = z.object({
  enabled: z.boolean(),
  seconds: z.number().int().min(MIN_SECONDS).max(MAX_SECONDS),
})
export interface VisibilityPreferences {
  readonly enabled: boolean
  readonly seconds: number
}
export const parseVisibilityPreferences = (value: unknown): VisibilityPreferences | null => {
  const result = preferencesSchema.safeParse(value)
  return result.success ? result.data : null
}
export const isVisibilitySeconds = (seconds: number) =>
  Number.isInteger(seconds) && seconds >= MIN_SECONDS && seconds <= MAX_SECONDS

export interface VisibilityPreferenceStorage {
  readonly usesNative: () => boolean
  readonly readWeb: () => VisibilityPreferences | null
  readonly readToss: () => Promise<VisibilityPreferences | null>
  readonly writeWeb: (value: VisibilityPreferences) => unknown | null
  readonly writeToss: (value: VisibilityPreferences) => Promise<void>
}
export interface VisibilityPreferenceRepository {
  readonly readWeb: () => VisibilityPreferences | null
  readonly restoreNative: (
    stored: VisibilityPreferences | null,
  ) => Promise<VisibilityPreferences | null>
  readonly write: (value: VisibilityPreferences) => unknown | null | Promise<unknown | null>
}

/** Owns web-first restoration, native repair, and latest-value persistence for visibility settings. */
export const createVisibilityPreferenceRepository = (
  storage: VisibilityPreferenceStorage,
): VisibilityPreferenceRepository => {
  const writeLatest = createLatestAsyncTask((value: VisibilityPreferences) =>
    storage.writeToss(value),
  )
  return {
    readWeb: () => storage.readWeb(),
    async restoreNative(stored) {
      if (!storage.usesNative()) {
        return null
      }
      if (stored !== null) {
        await writeLatest(stored)
        return null
      }
      return storage.readToss()
    },
    write(value) {
      const error = storage.writeWeb(value)
      if (!storage.usesNative()) {
        return error
      }
      return writeLatest(value).then(
        () => error,
        (nativeError: unknown) => nativeError,
      )
    },
  }
}
export const visibilityPreferenceRepository = createVisibilityPreferenceRepository({
  readToss: () => readTossStorageJson(STORAGE_KEY, parseVisibilityPreferences),
  readWeb: () => readWebStorageJson(STORAGE_KEY, parseVisibilityPreferences),
  usesNative: hasNativeStorageBridge,
  writeToss: (value) => writeTossStorageJson(STORAGE_KEY, value),
  writeWeb: (value) => writeWebStorageJson(STORAGE_KEY, value),
})

/** Adapts web-first visibility restoration and native repair to the preference provider. */
export const visibilityPreferenceStorage: PreferenceStorage = {
  read: () => {
    const stored = visibilityPreferenceRepository.readWeb()
    if (stored !== null) {
      if (hasNativeStorageBridge()) {
        visibilityPreferenceRepository.restoreNative(stored).catch(globalThis.reportError)
      }
      return stored
    }
    return hasNativeStorageBridge() ? visibilityPreferenceRepository.restoreNative(null) : null
  },
  write: (_key, value) => {
    const preferences = parseVisibilityPreferences(value)
    return preferences === null ? null : visibilityPreferenceRepository.write(preferences)
  },
}
