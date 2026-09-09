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
  await pendingWrite
  return (
    (await readNativeStorageJson(STORAGE_KEY, parseSettings)) ?? {
      ...DEFAULT_SERVICE_SETTINGS,
      start: (await readNativeStorageJson(LEGACY_KEY, parseStart)) ?? '',
    }
  )
}

export const writeServiceSettings = async (value: ServiceSettings): Promise<void> => {
  const webError = writeWebStorageJson(STORAGE_KEY, value)
  if (!hasNativeStorageBridge()) {
    if (webError !== null) {
      throw new Error('Failed to persist service settings.', {cause: webError})
    }
    return
  }
  const write = pendingWrite.then(() => writeNativeStorageJson(STORAGE_KEY, value))
  pendingWrite = write.catch(() => undefined)
  await write
}
