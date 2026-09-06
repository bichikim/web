import {PSelect} from '../PSelect'

import * as m from '@paraglide/message'
import type {LanguageLearningLanguage} from '../../features/language-learning'
import {
  SUPERTONIC_MODELS,
  SUPERTONIC_VOICES,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../../features/supertonic'

// oxlint-disable-next-line eslint/no-magic-numbers -- Product count options are the persisted user choices.
const COUNTS = [1, 2, 3, 4, 5] as const
const LANGUAGES = ['ko', 'en', 'ja'] as const
export type LanguageLearningCount = (typeof COUNTS)[number]

export interface LanguageLearningSettingsProps {
  readonly count: LanguageLearningCount
  readonly disabled: boolean
  readonly language: LanguageLearningLanguage
  readonly modelId: SupertonicModelId
  readonly onCountChange: (count: LanguageLearningCount) => void
  readonly onLanguageChange: (language: LanguageLearningLanguage) => void
  readonly onModelChange: (modelId: SupertonicModelId) => void
  readonly onVoiceChange: (voiceId: SupertonicVoiceId) => void
  readonly sentenceDisabled?: boolean
  readonly voiceId: SupertonicVoiceId
}

const getLanguageLabel = (language: LanguageLearningLanguage) => {
  switch (language) {
    case 'en':
      return m.learning_language_en()
    case 'ja':
      return m.learning_language_ja()
    case 'ko':
      return m.learning_language_ko()
  }
}

export const LanguageLearningSettings = (props: LanguageLearningSettingsProps) => (
  <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
    <PSelect
      label={m.learning_filter_language()}
      disabled={props.disabled || props.sentenceDisabled}
      options={LANGUAGES.map((value) => ({label: getLanguageLabel(value), value}))}
      value={props.language}
      onChange={props.onLanguageChange}
    />
    <PSelect
      label={m.learning_editor_count()}
      disabled={props.disabled || props.sentenceDisabled}
      options={COUNTS.map((count) => ({label: String(count), value: String(count)}))}
      value={String(props.count)}
      onChange={(value) => {
        const count = COUNTS.find((item) => String(item) === value)
        if (count !== undefined) {
          props.onCountChange(count)
        }
      }}
    />
    <PSelect
      label={m.learning_editor_voice()}
      disabled={props.disabled}
      options={SUPERTONIC_VOICES.map((voice) => ({label: voice.label, value: voice.id}))}
      value={props.voiceId}
      onChange={props.onVoiceChange}
    />
    <PSelect
      label={m.learning_editor_model()}
      disabled={props.disabled}
      options={SUPERTONIC_MODELS.map((model) => ({label: model.label, value: model.id}))}
      value={props.modelId}
      onChange={props.onModelChange}
    />
  </div>
)
