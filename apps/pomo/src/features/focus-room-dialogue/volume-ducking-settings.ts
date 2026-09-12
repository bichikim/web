import {z} from 'zod'

import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

export const DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT =
  'pomo:dialogue-volume-ducking-settings-changed'

export interface DialogueVolumeDuckingSettings {
  readonly enabled: boolean
  readonly playerVolumePercent: number
  readonly version: 2
}

export interface DialogueVolumeDuckingSettingsStorage {
  readonly usesTossStorage: () => boolean
  readonly readToss: (key: string) => Promise<unknown | null>
  readonly readWeb: (key: string) => unknown | null
  readonly writeToss: (key: string, value: unknown) => Promise<void>
  readonly writeWeb: (key: string, value: unknown) => void
}

export interface DialogueVolumeDuckingSettingsRepository {
  readonly read: () => Promise<DialogueVolumeDuckingSettings>
  readonly write: (settings: DialogueVolumeDuckingSettings) => Promise<void>
}

export interface CreateDialogueVolumeDuckingSettingsRepositoryOptions {
  readonly storage: DialogueVolumeDuckingSettingsStorage
}

export const DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS = {
  enabled: true,
  playerVolumePercent: 50,
  version: 2,
} as const satisfies DialogueVolumeDuckingSettings

interface LegacyDialogueVolumeDuckingSettings {
  readonly enabled: boolean
  readonly reductionPercent: number
  readonly version: 1
}

const STORAGE_KEY = 'pomo:dialogue-volume-ducking-settings:v2'
const LEGACY_STORAGE_KEY = 'pomo:dialogue-volume-ducking-settings:v1'
const MINIMUM_PLAYER_VOLUME_PERCENT = 0
const MAXIMUM_PLAYER_VOLUME_PERCENT = 100
const settingsSchema: z.ZodType<DialogueVolumeDuckingSettings> = z.object({
  enabled: z.boolean(),
  playerVolumePercent: z
    .number()
    .int()
    .min(MINIMUM_PLAYER_VOLUME_PERCENT)
    .max(MAXIMUM_PLAYER_VOLUME_PERCENT),
  version: z.literal(2),
})
const legacySettingsSchema: z.ZodType<LegacyDialogueVolumeDuckingSettings> = z.object({
  enabled: z.boolean(),
  reductionPercent: z
    .number()
    .int()
    .min(MINIMUM_PLAYER_VOLUME_PERCENT)
    .max(MAXIMUM_PLAYER_VOLUME_PERCENT),
  version: z.literal(1),
})

export const parseDialogueVolumeDuckingSettings = (
  value: unknown,
): DialogueVolumeDuckingSettings | null => {
  const result = settingsSchema.safeParse(value)
  return result.success ? result.data : null
}

const parseLegacySettings = (value: unknown): LegacyDialogueVolumeDuckingSettings | null => {
  const result = legacySettingsSchema.safeParse(value)
  return result.success ? result.data : null
}

const migrateLegacySettings = (
  settings: LegacyDialogueVolumeDuckingSettings,
): DialogueVolumeDuckingSettings => ({
  enabled: settings.enabled,
  playerVolumePercent: settings.reductionPercent,
  version: 2,
})

/** Creates the persistence policy for dialogue volume settings over one storage boundary. */
export const createDialogueVolumeDuckingSettingsRepository = (
  options: CreateDialogueVolumeDuckingSettingsRepositoryOptions,
): DialogueVolumeDuckingSettingsRepository => {
  const {storage} = options
  let preferenceWriteRevision = 0
  let tossWriteQueue = Promise.resolve()

  const writeWebSettings = (settings: DialogueVolumeDuckingSettings) => {
    try {
      storage.writeWeb(STORAGE_KEY, settings)
      return null
    } catch (error: unknown) {
      return error
    }
  }

  const readWebSettings = (): DialogueVolumeDuckingSettings | null => {
    const settings = parseDialogueVolumeDuckingSettings(storage.readWeb(STORAGE_KEY))

    if (settings !== null) {
      return settings
    }

    const legacySettings = parseLegacySettings(storage.readWeb(LEGACY_STORAGE_KEY))

    if (legacySettings === null) {
      return null
    }

    const migratedSettings = migrateLegacySettings(legacySettings)
    writeWebSettings(migratedSettings)
    return migratedSettings
  }

  const readTossSettings = async (): Promise<DialogueVolumeDuckingSettings | null> => {
    const settings = parseDialogueVolumeDuckingSettings(await storage.readToss(STORAGE_KEY))

    if (settings !== null) {
      return settings
    }

    const legacySettings = parseLegacySettings(await storage.readToss(LEGACY_STORAGE_KEY))
    return legacySettings === null ? null : migrateLegacySettings(legacySettings)
  }

  const enqueueTossWrite = (settings: DialogueVolumeDuckingSettings) => {
    const tossWrite = tossWriteQueue.then(() => storage.writeToss(STORAGE_KEY, settings))
    tossWriteQueue = tossWrite.catch(() => undefined)
    return tossWrite
  }

  const read = async (): Promise<DialogueVolumeDuckingSettings> => {
    const initialWriteRevision = preferenceWriteRevision

    if (!storage.usesTossStorage()) {
      return readWebSettings() ?? DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS
    }

    try {
      await tossWriteQueue
      const tossSettings = await readTossSettings()

      if (preferenceWriteRevision !== initialWriteRevision) {
        return read()
      }

      if (tossSettings === null) {
        writeWebSettings(DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS)
        return DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS
      }

      writeWebSettings(tossSettings)
      return tossSettings
    } catch (error: unknown) {
      throw new Error('Failed to read dialogue volume ducking settings.', {cause: error})
    }
  }

  const write = async (settings: DialogueVolumeDuckingSettings): Promise<void> => {
    const snapshot = settingsSchema.parse(settings)
    preferenceWriteRevision += 1
    const webWriteError = writeWebSettings(snapshot)

    if (!storage.usesTossStorage()) {
      if (webWriteError !== null) {
        throw new Error('Failed to persist dialogue volume ducking settings.', {
          cause: webWriteError,
        })
      }

      return
    }

    try {
      await enqueueTossWrite(snapshot)
    } catch (error: unknown) {
      throw new Error('Failed to persist dialogue volume ducking settings.', {
        cause: error,
      })
    }
  }

  return {read, write}
}

const preserveStoredValue = (value: unknown) => value
const runtimeStorage = {
  readToss: (key: string) => readTossStorageJson(key, preserveStoredValue),
  readWeb: (key: string) => readWebStorageJson(key, preserveStoredValue),
  usesTossStorage: hasNativeStorageBridge,
  writeToss: writeTossStorageJson,
  writeWeb(key: string, value: unknown) {
    const error = writeWebStorageJson(key, value)

    if (error !== null) {
      throw error
    }
  },
} satisfies DialogueVolumeDuckingSettingsStorage
const runtimeRepository = createDialogueVolumeDuckingSettingsRepository({
  storage: runtimeStorage,
})

/** Reads the dialogue volume setting from the authoritative storage for the current runtime. */
export const readDialogueVolumeDuckingSettings = () => runtimeRepository.read()

/** Persists the dialogue volume setting until the host app or browser data is removed. */
export const writeDialogueVolumeDuckingSettings = (settings: DialogueVolumeDuckingSettings) =>
  runtimeRepository.write(settings)
