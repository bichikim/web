import {Storage} from '@apps-in-toss/web-framework'
import {z} from 'zod'

export const RANDOM_EVENT_SETTINGS_CHANGED_EVENT = 'pomo:random-event-settings-changed'

export interface RandomEventSettings {
  readonly maximumMinutes: number
  readonly minimumMinutes: number
  readonly version: 1
}

export const DEFAULT_RANDOM_EVENT_SETTINGS = {
  maximumMinutes: 20,
  minimumMinutes: 10,
  version: 1,
} as const satisfies RandomEventSettings

const STORAGE_KEY = 'pomo:random-event-settings:v1'
const MAXIMUM_INTERVAL_MINUTES = 120
const MINIMUM_INTERVAL_MINUTES = 1
const randomEventSettingsSchema: z.ZodType<RandomEventSettings> = z
  .object({
    maximumMinutes: z.number().int().min(MINIMUM_INTERVAL_MINUTES).max(MAXIMUM_INTERVAL_MINUTES),
    minimumMinutes: z.number().int().min(MINIMUM_INTERVAL_MINUTES).max(MAXIMUM_INTERVAL_MINUTES),
    version: z.literal(1),
  })
  .refine((settings) => settings.minimumMinutes <= settings.maximumMinutes)
let preferenceWriteRevision = 0
let nativeWriteQueue = Promise.resolve()

export const parseRandomEventSettings = (value: unknown): RandomEventSettings | null => {
  const result = randomEventSettingsSchema.safeParse(value)
  return result.success ? result.data : null
}

const parseStoredSettings = (storedValue: string | null) => {
  if (storedValue === null) {
    return null
  }

  try {
    return parseRandomEventSettings(JSON.parse(storedValue) as unknown)
  } catch {
    return null
  }
}

const hasNativeBridge = () => 'ReactNativeWebView' in window

const readWebSettings = () => {
  try {
    return parseStoredSettings(localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

const writeWebSettings = (settings: RandomEventSettings) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return null
  } catch (error: unknown) {
    return error
  }
}

const enqueueNativeWrite = (settings: RandomEventSettings) => {
  const write = nativeWriteQueue.then(async () => {
    try {
      await Storage.setItem(STORAGE_KEY, JSON.stringify(settings))
      return null
    } catch (error: unknown) {
      return error
    }
  })
  nativeWriteQueue = write.then(() => undefined)

  return write
}

/** Reads the random event settings from storage whose lifetime matches the current runtime. */
export const readRandomEventSettings = async (): Promise<RandomEventSettings> => {
  const initialWriteRevision = preferenceWriteRevision
  const webSettings = readWebSettings()

  if (webSettings !== null) {
    return webSettings
  }

  if (!hasNativeBridge()) {
    return DEFAULT_RANDOM_EVENT_SETTINGS
  }

  try {
    const nativeSettings = parseStoredSettings(await Storage.getItem(STORAGE_KEY))

    if (nativeSettings === null) {
      return DEFAULT_RANDOM_EVENT_SETTINGS
    }

    if (preferenceWriteRevision === initialWriteRevision) {
      writeWebSettings(nativeSettings)
    }

    return nativeSettings
  } catch {
    return readWebSettings() ?? DEFAULT_RANDOM_EVENT_SETTINGS
  }
}

/** Persists random event settings until the host app or browser data is removed. */
export const writeRandomEventSettings = async (settings: RandomEventSettings): Promise<void> => {
  const snapshot = randomEventSettingsSchema.parse(settings)
  preferenceWriteRevision += 1
  const webWriteError = writeWebSettings(snapshot)

  if (!hasNativeBridge()) {
    if (webWriteError !== null) {
      throw new Error('Failed to persist random event settings.', {cause: webWriteError})
    }

    return
  }

  const nativeWriteError = await enqueueNativeWrite(snapshot)

  if (webWriteError !== null && nativeWriteError !== null) {
    throw new Error('Failed to persist random event settings.', {cause: nativeWriteError})
  }
}
