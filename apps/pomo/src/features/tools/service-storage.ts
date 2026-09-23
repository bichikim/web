import {z} from 'zod'

import {type ServiceBranch} from './calculate-service'
import {normalizeServiceDays} from './service-days'
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
  days: z.string().transform(normalizeServiceDays),
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
  readonly reportRepairError: (error: unknown) => void
}

/** Reads and writes service settings, including legacy start dates. */
export const createServiceSettingsStorage = (
  options: CreateServiceSettingsStorageOptions,
): ServiceSettingsStorage => {
  const {storage, reportRepairError} = options
  const read = async (): Promise<ServiceSettings> => {
    const usesTossStorage = storage.usesTossStorage()
    const webSettings = storage.readWeb(STORAGE_KEY, parseSettings)
    if (webSettings !== null) {
      if (usesTossStorage) {
        await storage.writeToss(STORAGE_KEY, webSettings).catch(reportRepairError)
      }
      return webSettings
    }
    const legacySettings = () => ({
      ...DEFAULT_SERVICE_SETTINGS,
      start: storage.readWeb(LEGACY_KEY, parseStart) ?? '',
    })
    if (!usesTossStorage) {
      return legacySettings()
    }
    const tossSettings = await storage.readToss(STORAGE_KEY, parseSettings)
    if (tossSettings !== null) {
      // Keep the settings available when the Toss bridge disappears before the next read.
      storage.writeWeb(STORAGE_KEY, tossSettings)
      return tossSettings
    }
    const webLegacy = legacySettings()
    if (webLegacy.start !== '') {
      return webLegacy
    }
    const nativeStart = await storage.readToss(LEGACY_KEY, parseStart)
    const nativeLegacySettings = {...DEFAULT_SERVICE_SETTINGS, start: nativeStart ?? ''}
    if (nativeStart !== null) {
      storage.writeWeb(STORAGE_KEY, nativeLegacySettings)
    }
    return nativeLegacySettings
  }

  const write = async (value: ServiceSettings): Promise<void> => {
    const webError = storage.writeWeb(STORAGE_KEY, value)
    if (!storage.usesTossStorage()) {
      if (webError !== null) {
        throw new Error('Failed to persist service settings.', {cause: webError})
      }
      return
    }
    await storage.writeToss(STORAGE_KEY, value)
    // A failed web replacement must not shadow the newly persisted native value.
    if (webError !== null) {
      const error = storage.removeWeb(STORAGE_KEY)
      if (error !== null && storage.readWeb(STORAGE_KEY, parseSettings) !== null) {
        throw new Error('Failed to discard stale service settings.', {cause: error})
      }
    }
  }
  return {read, write}
}

const runtimeStorage = createServiceSettingsStorage({
  reportRepairError: (error) => {
    console.warn('Failed to repair native service settings.', error)
  },
  storage: toolStorageAdapter,
})
export const readServiceSettings = runtimeStorage.read
export const writeServiceSettings = runtimeStorage.write

const draftSchema = settingsSchema.extend({days: z.string()})
const parseDraft = (value: unknown): ServiceSettings | null => {
  const result = draftSchema.safeParse(value)
  return result.success ? result.data : null
}
export const servicePreference = {
  defaultValue: DEFAULT_SERVICE_SETTINGS,
  key: STORAGE_KEY,
  parse: parseDraft,
  storage: {
    read: readServiceSettings,
    write: (_key: string, value: unknown) => {
      const parsed = parseDraft(value)
      return parsed === null ? null : writeServiceSettings(parsed)
    },
  },
}
