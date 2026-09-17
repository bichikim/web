import {z} from 'zod'

import {type PreferenceStorage, webLocalStorage} from 'src/utils/preference-storage'
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

export {DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS} from './automatic-dialogue-settings-contract'
export type {
  AutomaticDialogueSettings,
  AutomaticDialogueSettingsRepository,
  AutomaticDialogueSettingsStorage,
} from './automatic-dialogue-settings-contract'

export const AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY = 'pomo:automatic-dialogue-settings:v1'

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

export const parseAutomaticDialogueSettings = (
  value: unknown,
): AutomaticDialogueSettings | null => {
  const result = automaticDialogueSettingsSchema.safeParse(value)
  return result.success ? result.data : null
}

const createRuntimeRepository = () =>
  createAutomaticDialogueSettingsRepository(globalThis.localStorage)

/** Persists the model and voice used for unattended dialogue generation. */
export const createAutomaticDialogueSettingsRepository = (
  storage: AutomaticDialogueSettingsStorage,
): AutomaticDialogueSettingsRepository => ({
  load() {
    const storedValue = storage.getItem(AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY)

    if (storedValue === null) {
      return DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS
    }

    try {
      const parsedValue: unknown = JSON.parse(storedValue)
      const settings = parseAutomaticDialogueSettings(parsedValue)
      if (settings === null) {
        throw new Error('Invalid automatic dialogue settings.')
      }
      return settings
    } catch (error: unknown) {
      throw new Error('저장된 자동 음성 생성 설정이 올바르지 않아요.', {cause: error})
    }
  },
  save(settings) {
    const snapshot = automaticDialogueSettingsSchema.parse(settings)
    storage.setItem(AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY, JSON.stringify(snapshot))
  },
})

const automaticDialoguePreferenceStorage: PreferenceStorage = {
  read: () => createRuntimeRepository().load(),
  subscribe: webLocalStorage.subscribe,
  write: (_key, value) => {
    const settings = parseAutomaticDialogueSettings(value)

    if (settings === null) {
      return new Error('Invalid automatic dialogue settings.')
    }

    try {
      createRuntimeRepository().save(settings)
      return null
    } catch (error: unknown) {
      return error
    }
  },
}

export interface AutomaticDialoguePreferenceOptions {
  readonly onError?: (error: unknown) => void
  readonly onSaved?: () => void
}

/** Creates the shared preference definition for automatic dialogue settings. */
export const createAutomaticDialoguePreferenceOptions = (
  options: AutomaticDialoguePreferenceOptions = {},
) => ({
  defaultValue: DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
  key: AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY,
  onError: options.onError,
  onSaved: options.onSaved,
  parse: parseAutomaticDialogueSettings,
  storage: automaticDialoguePreferenceStorage,
})
