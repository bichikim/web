import {createCollectionChangeSignal} from '../value-storage'

import type {LanguageLearningStorageOptions} from './storage'
import {LANGUAGE_LEARNING_WORDS_CHANGED_EVENT, readLanguageLearningWords} from './word-storage'

export const useLanguageLearningWords = (options: LanguageLearningStorageOptions = {}) => {
  return createCollectionChangeSignal({
    event: LANGUAGE_LEARNING_WORDS_CHANGED_EVENT,
    events: options.events,
    read: () => readLanguageLearningWords(options),
  })
}
