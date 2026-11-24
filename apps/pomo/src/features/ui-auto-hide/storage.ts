import {z} from 'zod'
import {createLatestAsyncTask} from 'src/utils/create-latest-async-task'
import {createParsedPreferenceStorage} from '../parsed-preference-storage'
import {
  createTimestampedFieldCodec,
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'
import {createTimestampedDualRuntimeStorage} from 'src/utils/runtime-storage/create-timestamped-dual-runtime-storage'

const MIN_SECONDS = 5
const MAX_SECONDS = 3600
export const UI_AUTO_HIDE_STORAGE_KEY = 'pomo:ui-auto-hide:v1'
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

const codec = createTimestampedFieldCodec('preferences', preferencesSchema)
type StoredVisibilityPreferences = ReturnType<typeof codec.toStored>

export interface VisibilityPreferenceStorage {
  readonly usesNative: () => boolean
  readonly readWeb: () => unknown
  readonly readToss: () => Promise<unknown>
  readonly writeWeb: (value: StoredVisibilityPreferences) => unknown | null
  readonly writeToss: (value: StoredVisibilityPreferences) => Promise<void>
}

export interface VisibilityPreferenceRepository {
  readonly read: () => VisibilityPreferences | null | Promise<VisibilityPreferences | null>
  readonly write: (value: VisibilityPreferences) => Promise<void>
}

/** Reconciles native and web settings, preserving the legacy web preference when neither has a date. */
export const createVisibilityPreferenceRepository = (
  storage: VisibilityPreferenceStorage,
): VisibilityPreferenceRepository => {
  const coordinator = createTimestampedDualRuntimeStorage<StoredVisibilityPreferences>({
    now: Date.now,
    timestamp: 'monotonic',
  })
  const writeLatest = createLatestAsyncTask(storage.writeToss)
  const readWeb = () => codec.parseStored(storage.readWeb())
  const restoreNative = async (): Promise<VisibilityPreferences | null> => {
    const revision = coordinator.revision()
    await coordinator.settleWrites()
    const web = readWeb()
    const native = await storage.readToss().then(codec.parseStored, () => null)
    if (coordinator.revision() !== revision) {
      return restoreNative()
    }

    const latest = coordinator.selectLatest(web, native)
    coordinator.observeSavedAt(latest?.savedAt ?? 0)
    if (latest === null) {
      return null
    }
    if (latest === web) {
      await writeLatest(latest).catch((error: unknown) => globalThis.reportError(error))
      if (coordinator.revision() !== revision) {
        return restoreNative()
      }
    } else {
      storage.writeWeb(latest)
    }
    return latest.preferences
  }
  const persist = async (value: StoredVisibilityPreferences) => {
    const webError = storage.writeWeb(value)
    if (!storage.usesNative()) {
      if (webError !== null) {
        throw webError
      }
      return
    }
    try {
      await writeLatest(value)
    } catch (error: unknown) {
      if (webError !== null) {
        throw error
      }
    }
  }
  return {
    read: () => (storage.usesNative() ? restoreNative() : (readWeb()?.preferences ?? null)),
    write: (value) => coordinator.writeStored((savedAt) => codec.toStored(value, savedAt), persist),
  }
}

export const readWebVisibilityPreferences = (): VisibilityPreferences | null =>
  readWebStorageJson(
    UI_AUTO_HIDE_STORAGE_KEY,
    (value) => codec.parseStored(value)?.preferences ?? null,
  )

export const visibilityPreferenceRepository = createVisibilityPreferenceRepository({
  readToss: () => readTossStorageJson(UI_AUTO_HIDE_STORAGE_KEY, (value) => value),
  readWeb: () => readWebStorageJson(UI_AUTO_HIDE_STORAGE_KEY, (value) => value),
  usesNative: hasNativeStorageBridge,
  writeToss: (value) => writeTossStorageJson(UI_AUTO_HIDE_STORAGE_KEY, value),
  writeWeb: (value) => writeWebStorageJson(UI_AUTO_HIDE_STORAGE_KEY, value),
})

export const visibilityPreferenceStorage = createParsedPreferenceStorage({
  invalidMessage: 'Invalid UI auto-hide preferences.',
  parse: parseVisibilityPreferences,
  read: () => visibilityPreferenceRepository.read(),
  write: (value) => visibilityPreferenceRepository.write(value),
})
