import {
  createBoundTossWebStorageAdapter,
  createVersionedPreferenceRepository,
  getWebRuntimeStorage,
} from 'src/utils/runtime-storage'
import {createPreferenceOptions} from 'src/features/preference-options'
import {createParsedPreferenceStorage} from '../parsed-preference-storage'
import {createJsonCodec, createValueStorage} from '../value-storage'
import {z} from 'zod'

import {webLocalStorage} from 'src/utils/preference-storage'
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
  version: z.literal(1).default(1),
  voiceId: voiceIdSchema,
})

export const parseAutomaticDialogueSettings = (
  value: unknown,
): AutomaticDialogueSettings | null => {
  const result = automaticDialogueSettingsSchema.safeParse(value)
  return result.success ? result.data : null
}

const codec = createJsonCodec(parseAutomaticDialogueSettings)
const decodeAutomaticDialogueSettings = (stored: string): AutomaticDialogueSettings => {
  try {
    const settings = codec.decode(stored)
    if (settings === null) {
      throw new Error('Invalid automatic dialogue settings.')
    }
    return settings
  } catch (error: unknown) {
    throw new Error('저장된 자동 음성 생성 설정이 올바르지 않아요.', {cause: error})
  }
}

/** Creates dual-runtime persistence with an optional injected browser storage boundary. */
export const createAutomaticDialogueRuntimeRepository = (
  webStorage?: AutomaticDialogueSettingsStorage,
) => {
  const adapter = createBoundTossWebStorageAdapter({
    key: AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY,
    parse: parseAutomaticDialogueSettings,
  })
  const readWeb = () => {
    try {
      const storage = webStorage ?? getWebRuntimeStorage()
      const stored = storage.getItem(AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY)
      return stored === null ? null : decodeAutomaticDialogueSettings(stored)
    } catch (error: unknown) {
      if (!adapter.isNative()) {
        throw error
      }
      return null
    }
  }
  const writeWeb = (value: AutomaticDialogueSettings) => {
    try {
      createAutomaticDialogueSettingsRepository(webStorage ?? getWebRuntimeStorage()).save(value)
      return null
    } catch (error: unknown) {
      return error
    }
  }
  return createVersionedPreferenceRepository({
    defaultValue: DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
    parse: (value: AutomaticDialogueSettings) => automaticDialogueSettingsSchema.parse(value),
    storage: {
      isNative: adapter.isNative,
      readNative: adapter.readToss,
      readWeb,
      writeNative: adapter.writeToss,
      writeWeb,
    },
    writeFailureMessage: 'Failed to persist automatic dialogue settings.',
  })
}
const runtimeRepository = createAutomaticDialogueRuntimeRepository()

/** Persists the model and voice used for unattended dialogue generation. */
export const createAutomaticDialogueSettingsRepository = (
  storage: AutomaticDialogueSettingsStorage,
): AutomaticDialogueSettingsRepository => {
  const value = createValueStorage({
    ...codec,
    decode: decodeAutomaticDialogueSettings,
    key: AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY,
    storage: () => storage,
  })
  return {
    load: () => value.read() ?? DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
    save: (settings) => value.write(automaticDialogueSettingsSchema.parse(settings)),
  }
}

const automaticDialoguePreferenceStorage = createParsedPreferenceStorage({
  invalidMessage: 'Invalid automatic dialogue settings.',
  parse: parseAutomaticDialogueSettings,
  read: () => runtimeRepository.read(),
  subscribe: webLocalStorage.subscribe,
  write: (settings) => runtimeRepository.write(settings),
})

export interface AutomaticDialoguePreferenceOptions {
  readonly onError?: (error: unknown) => void
  readonly onSaved?: () => void
}

/** Creates the shared preference definition for automatic dialogue settings. */
export const createAutomaticDialoguePreferenceOptions = createPreferenceOptions({
  defaultValue: DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS,
  key: AUTOMATIC_DIALOGUE_SETTINGS_STORAGE_KEY,
  parse: parseAutomaticDialogueSettings,
  storage: automaticDialoguePreferenceStorage,
})
