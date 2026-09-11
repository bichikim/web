import {z} from 'zod'
import {type ServiceBranch} from './service'
import {
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeNativeStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'
import {parseDate} from '../civil-date'

const STORAGE_KEY = 'pomo:service-settings:v1'
const LEGACY_KEY = 'pomo:service-start:v1'
export interface ServiceSettings {
  readonly branch: ServiceBranch
  readonly days: string
  readonly manual: boolean
  readonly start: string
}
export const DEFAULT_SERVICE_SETTINGS: ServiceSettings = {
  branch: 'army',
  days: '',
  manual: false,
  start: '',
}
const settingsSchema = z.object({
  branch: z.enum(['army', 'marines', 'navy', 'air']),
  days: z.string(),
  manual: z.boolean(),
  start: z.string().refine((value) => value === '' || parseDate(value) !== null),
})
const parseSettings = (value: unknown): ServiceSettings | null => {
  const result = settingsSchema.safeParse(value)
  return result.success ? result.data : null
}
let pendingWrite = Promise.resolve()
let writeRevision = 0
let browserRevision = 0
const parseStart = (value: unknown): string | null =>
  typeof value === 'string' && parseDate(value) !== null ? value : null

export const readServiceSettings = async (): Promise<ServiceSettings> => {
  if (!hasNativeStorageBridge()) {
    return (
      readWebStorageJson(STORAGE_KEY, parseSettings) ?? {
        ...DEFAULT_SERVICE_SETTINGS,
        start: readWebStorageJson(LEGACY_KEY, parseStart) ?? '',
      }
    )
  }
  const revision = writeRevision
  await pendingWrite
  const webSettings = readWebStorageJson(STORAGE_KEY, parseSettings)
  if (webSettings !== null) {
    return webSettings
  }
  const nativeSettings = await readNativeStorageJson(STORAGE_KEY, parseSettings).catch(() => null)
  const currentSettings = readWebStorageJson(STORAGE_KEY, parseSettings)
  if (currentSettings !== null) {
    return currentSettings
  }
  if (revision !== writeRevision) {
    return readServiceSettings()
  }
  if (nativeSettings !== null) {
    return nativeSettings
  }
  const nativeStart = await readNativeStorageJson(LEGACY_KEY, parseStart).catch(() => null)
  if (revision !== writeRevision) {
    return readServiceSettings()
  }
  return (
    readWebStorageJson(STORAGE_KEY, parseSettings) ?? {
      ...DEFAULT_SERVICE_SETTINGS,
      start: readWebStorageJson(LEGACY_KEY, parseStart) ?? nativeStart ?? '',
    }
  )
}

export const writeServiceSettings = async (value: ServiceSettings): Promise<void> => {
  writeRevision += 1
  const webError = writeWebStorageJson(STORAGE_KEY, value)
  if (webError === null) {
    browserRevision += 1
  }
  const revision = browserRevision
  if (!hasNativeStorageBridge()) {
    if (webError !== null) {
      throw new Error('Failed to persist service settings.', {cause: webError})
    }
    return
  }
  const write = pendingWrite.then(async () => {
    await writeNativeStorageJson(STORAGE_KEY, value)
    if (
      webError !== null &&
      revision === browserRevision &&
      readWebStorageJson(STORAGE_KEY, parseSettings) !== null
    ) {
      // A successful native-only save must not be hidden by an older browser copy.
      localStorage.removeItem(STORAGE_KEY)
    }
  })
  pendingWrite = write.catch(() => undefined)
  await write
}
