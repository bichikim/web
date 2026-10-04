/** @vitest-environment jsdom */

import {expect, it} from 'vitest'

import {
  LANGUAGE_LEARNING_WORD_SOURCE_STORAGE_KEY,
  readLanguageLearningWordSource,
} from '../features/language-learning/word-source-storage'

it('should restore word source when storage is a bare JSON string enum', () => {
  localStorage.setItem(LANGUAGE_LEARNING_WORD_SOURCE_STORAGE_KEY, JSON.stringify('saved'))

  expect(readLanguageLearningWordSource()).toBe('saved')
})
