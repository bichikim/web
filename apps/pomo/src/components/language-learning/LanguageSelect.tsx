import * as m from '@paraglide/message'

import {
  LANGUAGE_LEARNING_LANGUAGES,
  type LanguageLearningLanguage,
} from '../../features/language-learning'
import {PSelect, type PSelectOption} from '../PSelect'

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

const getLanguageOptions = () =>
  LANGUAGE_LEARNING_LANGUAGES.map((language) => ({
    label: getLanguageLabel(language),
    value: language,
  })) satisfies ReadonlyArray<PSelectOption<LanguageLearningLanguage>>

export interface LanguageLearningLanguageSelectProps {
  readonly class?: string
  readonly onChange?: (language: LanguageLearningLanguage) => void
  readonly value?: LanguageLearningLanguage
}

export const LanguageLearningLanguageSelect = (props: LanguageLearningLanguageSelectProps) => {
  return (
    <PSelect
      class={props.class}
      label={m.learning_filter_language()}
      onChange={(language) => props.onChange?.(language)}
      options={getLanguageOptions()}
      value={props.value ?? 'en'}
    />
  )
}
