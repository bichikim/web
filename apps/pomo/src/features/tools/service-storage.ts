import {z} from 'zod'
import {type ServiceBranch} from './service'
import {
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  removeWebStorageItem,
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
const parseStart = (value: unknown): string | null =>
  typeof value === 'string' && parseDate(value) !== null ? value : null

export const readServiceSettings = async (): Promise<ServiceSettings> => {
  const revision = writeRevision
  const isNative = hasNativeStorageBridge()
  if (isNative) {
    await pendingWrite
    if (revision !== writeRevision) {
      return readServiceSettings()
    }
  }
  const webSettings = readWebStorageJson(STORAGE_KEY, parseSettings)
  if (webSettings !== null) {
    return webSettings
  }
  const legacySettings = () => ({
    ...DEFAULT_SERVICE_SETTINGS,
    start: readWebStorageJson(LEGACY_KEY, parseStart) ?? '',
  })
  if (!isNative) {
    return legacySettings()
  }
  try {
    const nativeSettings = await readNativeStorageJson(STORAGE_KEY, parseSettings)
    if (revision !== writeRevision) {
      return readServiceSettings()
    }
    if (nativeSettings !== null) {
      return nativeSettings
    }
    const webLegacy = legacySettings()
    if (webLegacy.start !== '') {
      return webLegacy
    }
    const nativeStart = await readNativeStorageJson(LEGACY_KEY, parseStart)
    if (revision !== writeRevision) {
      return readServiceSettings()
    }
    return {...DEFAULT_SERVICE_SETTINGS, start: nativeStart ?? ''}
  } catch (error: unknown) {
    if (revision !== writeRevision) {
      return readServiceSettings()
    }
    throw error
  }
}

export const writeServiceSettings = async (value: ServiceSettings): Promise<void> => {
  writeRevision += 1
  const revision = writeRevision
  const webError = writeWebStorageJson(STORAGE_KEY, value)
  if (!hasNativeStorageBridge()) {
    if (webError !== null) {
      throw new Error('Failed to persist service settings.', {cause: webError})
    }
    return
  }
  const write = pendingWrite.then(async () => {
    await writeNativeStorageJson(STORAGE_KEY, value)
    // A failed web replacement must not shadow the newly persisted native value.
    if (webError !== null && revision === writeRevision) {
      const error = removeWebStorageItem(STORAGE_KEY)
      if (error !== null && readWebStorageJson(STORAGE_KEY, parseSettings) !== null) {
        throw new Error('Failed to discard stale service settings.', {cause: error})
      }
    }
  })
  pendingWrite = write.catch(() => undefined)
  await write
}
