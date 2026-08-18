import {z} from 'zod'

import {
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../supertonic/model'
import {
  type AutomaticDialogueSettings,
  type AutomaticDialogueSettingsRepository,
  type AutomaticDialogueSettingsStorage,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
} from './automatic-dialogue-settings-contract'

export {
  AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT,
  DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
} from './automatic-dialogue-settings-contract'
export type {
  AutomaticDialogueSettings,
  AutomaticDialogueSettingsRepository,
  AutomaticDialogueSettingsStorage,
} from './automatic-dialogue-settings-contract'

const STORAGE_KEY = 'pomo:automatic-dialogue-settings:v1'

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
