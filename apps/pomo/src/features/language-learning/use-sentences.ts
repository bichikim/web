import {createCollectionChangeSignal} from '../value-storage'

import {
  LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT,
  type LanguageLearningStorageOptions,
  readLanguageLearningSentences,
} from './storage'

export const useLanguageLearningSentences = (options: LanguageLearningStorageOptions = {}) => {
  return createCollectionChangeSignal({
    event: LANGUAGE_LEARNING_SENTENCES_CHANGED_EVENT,
    events: options.events,
    read: () => readLanguageLearningSentences(options),
  })
}
