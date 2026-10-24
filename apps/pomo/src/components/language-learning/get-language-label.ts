import * as m from '@paraglide/message'
import type {LanguageLearningLanguage} from '../../features/language-learning'

export const getLanguageLabel = (
  language: LanguageLearningLanguage,
): ReturnType<typeof m.learning_language_en> => {
  switch (language) {
    case 'en':
      return m.learning_language_en()
    case 'ja':
      return m.learning_language_ja()
    case 'ko':
      return m.learning_language_ko()
  }
}
