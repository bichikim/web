import {z} from 'zod'
import {type ServiceBranch} from './service'
import {toolStorageAdapter, type ToolStorageAdapter} from './storage-adapter'
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
const parseStart = (value: unknown): string | null =>
  typeof value === 'string' && parseDate(value) !== null ? value : null

export interface ServiceSettingsStorage {
  read(): Promise<ServiceSettings>
  write(value: ServiceSettings): Promise<void>
}
export interface CreateServiceSettingsStorageOptions {
  readonly storage: ToolStorageAdapter
}

/** Creates service settings persistence with an isolated write queue and revision. */
export const createServiceSettingsStorage = (
  options: CreateServiceSettingsStorageOptions,
): ServiceSettingsStorage => {
  const {storage} = options
  let pendingWrite = Promise.resolve()
  let writeRevision = 0
  const read = async (): Promise<ServiceSettings> => {
    const revision = writeRevision
    const isNative = storage.isNative()
    if (isNative) {
      await pendingWrite
      if (revision !== writeRevision) {
        return read()
      }
    }
    const webSettings = storage.readWeb(STORAGE_KEY, parseSettings)
    if (webSettings !== null) {
      return webSettings
    }
    const legacySettings = () => ({
      ...DEFAULT_SERVICE_SETTINGS,
      start: storage.readWeb(LEGACY_KEY, parseStart) ?? '',
    })
    if (!isNative) {
      return legacySettings()
    }
    try {
      const nativeSettings = await storage.readNative(STORAGE_KEY, parseSettings)
      if (revision !== writeRevision) {
        return read()
      }
      if (nativeSettings !== null) {
        return nativeSettings
      }
      const webLegacy = legacySettings()
      if (webLegacy.start !== '') {
        return webLegacy
      }
      const nativeStart = await storage.readNative(LEGACY_KEY, parseStart)
      if (revision !== writeRevision) {
        return read()
      }
      return {...DEFAULT_SERVICE_SETTINGS, start: nativeStart ?? ''}
    } catch (error: unknown) {
      if (revision !== writeRevision) {
        return read()
      }
      throw error
    }
  }

  const write = async (value: ServiceSettings): Promise<void> => {
    writeRevision += 1
    const revision = writeRevision
    const webError = storage.writeWeb(STORAGE_KEY, value)
    if (!storage.isNative()) {
      if (webError !== null) {
        throw new Error('Failed to persist service settings.', {cause: webError})
      }
      return
    }
    const write = pendingWrite.then(async () => {
      await storage.writeNative(STORAGE_KEY, value)
      // A failed web replacement must not shadow the newly persisted native value.
      if (webError !== null && revision === writeRevision) {
        const error = storage.removeWeb(STORAGE_KEY)
        if (error !== null && storage.readWeb(STORAGE_KEY, parseSettings) !== null) {
          throw new Error('Failed to discard stale service settings.', {cause: error})
        }
      }
    })
    pendingWrite = write.catch(() => undefined)
    await write
  }
  return {read, write}
}

const runtimeStorage = createServiceSettingsStorage({storage: toolStorageAdapter})
export const readServiceSettings = runtimeStorage.read
export const writeServiceSettings = runtimeStorage.write
