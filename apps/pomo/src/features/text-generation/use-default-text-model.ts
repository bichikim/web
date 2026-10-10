import {type Accessor, createMemo} from 'solid-js'
import {usePreference} from 'src/hooks/use-preference'
import {
  createTextGenerationPreferenceOptions,
  DEFAULT_TEXT_GENERATION_SETTINGS,
  type DefaultTextModelId,
} from './settings'

/** Reads the shared default model for text generation. */
export const useDefaultTextModel = (): Accessor<DefaultTextModelId> => {
  const [settings] = usePreference(createTextGenerationPreferenceOptions())
  return createMemo(() => settings()?.modelId ?? DEFAULT_TEXT_GENERATION_SETTINGS.modelId)
}
