import {z} from 'zod'
import {createPreferenceOptions} from 'src/features/preference-options'
import {createParsedPreferenceStorage} from 'src/features/parsed-preference-storage'
import {webLocalStorage} from 'src/utils/preference-storage'
import {
  createBoundTossWebStorageAdapter,
  createVersionedPreferenceRepository,
} from 'src/utils/runtime-storage'

export const DEFAULT_TEXT_MODEL_IDS = ['gemma-4-e2b', 'lfm-2.6b-qad'] as const
export type DefaultTextModelId = (typeof DEFAULT_TEXT_MODEL_IDS)[number]
export interface TextGenerationSettings {
  readonly modelId: DefaultTextModelId
  readonly version: 1
}
export const TEXT_GENERATION_SETTINGS_KEY = 'pomo:text-generation-settings:v1'
export const DEFAULT_TEXT_GENERATION_SETTINGS: TextGenerationSettings = {
  modelId: 'gemma-4-e2b',
  version: 1,
}
const settingsSchema = z.object({modelId: z.enum(DEFAULT_TEXT_MODEL_IDS), version: z.literal(1)})

export const parseTextGenerationSettings = (value: unknown): TextGenerationSettings | null => {
  const result = settingsSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Persists the default text model in browser and native app storage. */
export const createTextGenerationSettingsRepository = (
  storage?: Pick<Storage, 'getItem' | 'setItem'>,
) => {
  const adapter = createBoundTossWebStorageAdapter({
    key: TEXT_GENERATION_SETTINGS_KEY,
    parse: parseTextGenerationSettings,
  })
  const readWeb = () => {
    if (storage === undefined) {
      return adapter.readWeb()
    }
    const stored = storage.getItem(TEXT_GENERATION_SETTINGS_KEY)
    return stored === null ? null : parseTextGenerationSettings(JSON.parse(stored))
  }
  const writeWeb = (value: TextGenerationSettings) => {
    if (storage === undefined) {
      return adapter.writeWeb(value)
    }
    try {
      storage.setItem(TEXT_GENERATION_SETTINGS_KEY, JSON.stringify(value))
      return null
    } catch (error: unknown) {
      return error
    }
  }
  return createVersionedPreferenceRepository({
    defaultValue: DEFAULT_TEXT_GENERATION_SETTINGS,
    parse: (value: TextGenerationSettings) => settingsSchema.parse(value),
    storage: {
      isNative: adapter.isNative,
      readNative: adapter.readToss,
      readWeb,
      writeNative: adapter.writeToss,
      writeWeb,
    },
    writeFailureMessage: 'Failed to persist text generation settings.',
  })
}
const repository = createTextGenerationSettingsRepository()
const preferenceStorage = createParsedPreferenceStorage({
  invalidMessage: 'Invalid text generation settings.',
  parse: parseTextGenerationSettings,
  read: repository.read,
  subscribe: webLocalStorage.subscribe,
  write: repository.write,
})
export const createTextGenerationPreferenceOptions = createPreferenceOptions({
  defaultValue: DEFAULT_TEXT_GENERATION_SETTINGS,
  key: TEXT_GENERATION_SETTINGS_KEY,
  parse: parseTextGenerationSettings,
  storage: preferenceStorage,
})
