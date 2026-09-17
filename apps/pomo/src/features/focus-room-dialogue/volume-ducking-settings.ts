import {z} from 'zod'

import {type PreferenceStorage, webLocalStorage} from 'src/utils/preference-storage'
import {
  hasNativeStorageBridge,
  readTossStorageJson,
  readWebStorageJson,
  writeTossStorageJson,
  writeWebStorageJson,
} from 'src/utils/runtime-storage'

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

  const read = async (): Promise<DialogueVolumeDuckingSettings> => {
    if (!storage.usesTossStorage()) {
      return readWebSettings() ?? DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS
    }

    try {
      const tossSettings = await readTossSettings()

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
      await storage.writeToss(STORAGE_KEY, snapshot)
    } catch (error: unknown) {
      throw new Error('Failed to persist dialogue volume ducking settings.', {
        cause: error,
      })
    }
  }

  return {read, write}
}

const runtimeRepository = createDialogueVolumeDuckingSettingsRepository({
  storage: {
    readToss: (key) => readTossStorageJson(key, (value) => value),
    readWeb: (key) => readWebStorageJson(key, (value) => value),
    usesTossStorage: hasNativeStorageBridge,
    writeToss: writeTossStorageJson,
    writeWeb(key, value) {
      const error = writeWebStorageJson(key, value)
      if (error !== null) {
        throw error
      }
    },
  },
})

const preferenceStorage: PreferenceStorage = {
  read: () => runtimeRepository.read(),
  subscribe: webLocalStorage.subscribe,
  write: (_key, value) => {
    const settings = parseDialogueVolumeDuckingSettings(value)

    return settings === null
      ? new Error('Invalid dialogue volume ducking settings.')
      : runtimeRepository.write(settings).then(() => undefined)
  },
}

export interface DialogueVolumeDuckingPreferenceOptions {
  readonly onError?: (error: unknown) => void
  readonly onSaved?: () => void
}

/** Creates the shared preference definition for dialogue volume settings. */
export const createDialogueVolumeDuckingPreferenceOptions = (
  options: DialogueVolumeDuckingPreferenceOptions = {},
) => ({
  defaultValue: DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  key: STORAGE_KEY,
  onError: options.onError,
  onSaved: options.onSaved,
  parse: parseDialogueVolumeDuckingSettings,
  storage: preferenceStorage,
})

/** Reads the dialogue volume setting from the authoritative storage for the current runtime. */
export const readDialogueVolumeDuckingSettings = () => runtimeRepository.read()

/** Persists the dialogue volume setting until the host app or browser data is removed. */
export const writeDialogueVolumeDuckingSettings = (settings: DialogueVolumeDuckingSettings) =>
  runtimeRepository.write(settings)
