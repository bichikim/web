import {cx} from 'class-variance-authority'
import {For} from 'solid-js'

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
const FIELD_CLASS = cx(
  'grid gap-2 text-sm font-700 [&_select]:min-h-12 [&_select]:rounded-xl',
  '[&_select]:border [&_select]:border-solid [&_select]:border-border',
  '[&_select]:bg-[#17130f] [&_select]:px-4 [&_select]:text-foreground',
)

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
    <label class={FIELD_CLASS}>
      <span>{m.learning_filter_language()}</span>
      <select
        disabled={props.disabled || props.sentenceDisabled}
        onChange={(event) => {
          const nextLanguage = LANGUAGES.find((item) => item === event.currentTarget.value)
          if (nextLanguage !== undefined) {
            props.onLanguageChange(nextLanguage)
          }
        }}
        value={props.language}
      >
        <For each={LANGUAGES}>
          {(item) => <option value={item}>{getLanguageLabel(item)}</option>}
        </For>
      </select>
    </label>
    <label class={FIELD_CLASS}>
      <span>{m.learning_editor_count()}</span>
      <select
        disabled={props.disabled || props.sentenceDisabled}
        onChange={(event) => {
          const nextCount = COUNTS.find((item) => String(item) === event.currentTarget.value)
          if (nextCount !== undefined) {
            props.onCountChange(nextCount)
          }
        }}
        value={props.count}
      >
        <For each={COUNTS}>{(item) => <option value={item}>{item}</option>}</For>
      </select>
    </label>
    <label class={FIELD_CLASS}>
      <span>{m.learning_editor_voice()}</span>
      <select
        disabled={props.disabled}
        onChange={(event) => {
          const nextVoice = SUPERTONIC_VOICES.find((item) => item.id === event.currentTarget.value)
          if (nextVoice !== undefined) {
            props.onVoiceChange(nextVoice.id)
          }
        }}
        value={props.voiceId}
      >
        <For each={SUPERTONIC_VOICES}>
          {(voice) => <option value={voice.id}>{voice.label}</option>}
        </For>
      </select>
    </label>
    <label class={FIELD_CLASS}>
      <span>{m.learning_editor_model()}</span>
      <select
        disabled={props.disabled}
        onChange={(event) => {
          const nextModel = SUPERTONIC_MODELS.find((item) => item.id === event.currentTarget.value)
          if (nextModel !== undefined) {
            props.onModelChange(nextModel.id)
          }
        }}
        value={props.modelId}
      >
        <For each={SUPERTONIC_MODELS}>
          {(model) => <option value={model.id}>{model.label}</option>}
        </For>
      </select>
    </label>
  </div>
)
