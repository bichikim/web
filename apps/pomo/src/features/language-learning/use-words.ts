import {createCollectionChangeSignal} from '../value-storage'

import type {LanguageLearningStorageOptions} from './storage'
import {
  LANGUAGE_LEARNING_WORDS_CHANGED_EVENT,
  LANGUAGE_LEARNING_WORDS_STORAGE_KEY,
  readLanguageLearningWords,
} from './word-storage'

export const useLanguageLearningWords = (options: LanguageLearningStorageOptions = {}) => {
  return createCollectionChangeSignal({
    event: LANGUAGE_LEARNING_WORDS_CHANGED_EVENT,
    events: options.events,
    read: () => readLanguageLearningWords(options),
    webStorageKey: options.storage === undefined ? LANGUAGE_LEARNING_WORDS_STORAGE_KEY : undefined,
  })
}
