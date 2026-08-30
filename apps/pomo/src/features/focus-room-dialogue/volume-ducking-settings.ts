import {z} from 'zod'

import {
  createSerialNativeStorageWriter,
  hasNativeStorageBridge,
  readNativeStorageJson,
  readWebStorageJson,
  writeWebStorageJson,
} from 'src/features/runtime-storage'

export const DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT =
  'pomo:dialogue-volume-ducking-settings-changed'

export interface DialogueVolumeDuckingSettings {
  readonly enabled: boolean
  readonly playerVolumePercent: number
  readonly version: 2
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
let preferenceWriteRevision = 0
const nativeWriter = createSerialNativeStorageWriter()

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

const writeWebSettings = (settings: DialogueVolumeDuckingSettings) =>
  writeWebStorageJson(STORAGE_KEY, settings)

const readWebSettings = () => {
  const settings = readWebStorageJson(STORAGE_KEY, parseDialogueVolumeDuckingSettings)

  if (settings !== null) {
    return settings
  }

  const legacySettings = readWebStorageJson(LEGACY_STORAGE_KEY, parseLegacySettings)

  if (legacySettings === null) {
    return null
  }

  const migratedSettings = migrateLegacySettings(legacySettings)
  writeWebSettings(migratedSettings)
  return migratedSettings
}

const readNativeSettings = async (): Promise<DialogueVolumeDuckingSettings | null> => {
  const settings = await readNativeStorageJson(STORAGE_KEY, parseDialogueVolumeDuckingSettings)

  if (settings !== null) {
    return settings
  }

  const legacySettings = await readNativeStorageJson(LEGACY_STORAGE_KEY, parseLegacySettings)
  return legacySettings === null ? null : migrateLegacySettings(legacySettings)
}

/** Reads the dialogue volume setting from the authoritative storage for the current runtime. */
export const readDialogueVolumeDuckingSettings =
  async (): Promise<DialogueVolumeDuckingSettings> => {
    const initialWriteRevision = preferenceWriteRevision

    if (!hasNativeStorageBridge()) {
      return readWebSettings() ?? DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS
    }

    try {
      const nativeSettings = await readNativeSettings()

      if (nativeSettings === null) {
        return DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS
      }

      if (preferenceWriteRevision === initialWriteRevision) {
        writeWebSettings(nativeSettings)
      }

      return nativeSettings
    } catch (error: unknown) {
      throw new Error('Failed to read dialogue volume ducking settings.', {cause: error})
    }
  }

/** Persists the dialogue volume setting until the host app or browser data is removed. */
export const writeDialogueVolumeDuckingSettings = async (
  settings: DialogueVolumeDuckingSettings,
): Promise<void> => {
  const snapshot = settingsSchema.parse(settings)
  preferenceWriteRevision += 1
  const webWriteError = writeWebSettings(snapshot)

  if (!hasNativeStorageBridge()) {
    if (webWriteError !== null) {
      throw new Error('Failed to persist dialogue volume ducking settings.', {
        cause: webWriteError,
      })
    }

    return
  }

  const nativeWriteError = await nativeWriter.write(STORAGE_KEY, snapshot)

  if (nativeWriteError !== null) {
    throw new Error('Failed to persist dialogue volume ducking settings.', {
      cause: nativeWriteError,
    })
  }
}
