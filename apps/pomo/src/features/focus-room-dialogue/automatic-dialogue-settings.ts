import {z} from 'zod'

import {
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../supertonic'

const STORAGE_KEY = 'pomo:automatic-dialogue-settings:v1'

export const AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT = 'pomo:automatic-dialogue-settings-changed'
export const DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS: AutomaticDialogueSettings = {
  modelId: 'int8',
  version: 1,
  voiceId: 'Yuna',
}

const modelIdSchema = z.custom<SupertonicModelId>((value) =>
  SUPERTONIC_MODELS.some((model) => model.id === value),
)
const voiceIdSchema = z.custom<SupertonicVoiceId>((value) =>
  SUPERTONIC_VOICES.some((voice) => voice.id === value),
)
const automaticDialogueSettingsSchema: z.ZodType<AutomaticDialogueSettings> = z.object({
  modelId: modelIdSchema,
  version: z.literal(1),
  voiceId: voiceIdSchema,
})

export interface AutomaticDialogueSettings {
  readonly modelId: SupertonicModelId
  readonly version: 1
  readonly voiceId: SupertonicVoiceId
}

export interface AutomaticDialogueSettingsStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

export interface AutomaticDialogueSettingsRepository {
  readonly load: () => AutomaticDialogueSettings
  readonly save: (settings: AutomaticDialogueSettings) => void
}

/** Persists the model and voice used for unattended dialogue generation. */
export const createAutomaticDialogueSettingsRepository = (
  storage: AutomaticDialogueSettingsStorage,
): AutomaticDialogueSettingsRepository => ({
  load() {
    const storedValue = storage.getItem(STORAGE_KEY)

    if (storedValue === null) {
      return DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS
    }

    try {
      return automaticDialogueSettingsSchema.parse(JSON.parse(storedValue) as unknown)
    } catch (error: unknown) {
      throw new Error('저장된 자동 음성 생성 설정이 올바르지 않아요.', {cause: error})
    }
  },
  save(settings) {
    const snapshot = automaticDialogueSettingsSchema.parse(settings)
    storage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  },
})
