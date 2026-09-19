/** @vitest-environment jsdom */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {
  appendLanguageLearningWords,
  deleteLanguageLearningWord,
  readLanguageLearningWords,
} from '../features/language-learning/word-storage'

describe('language learning delete case sensitivity', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('should delete stored words using the same case-insensitive identity as append deduplication', () => {
    appendLanguageLearningWords('en', ['Home'])

    deleteLanguageLearningWord('en', 'home')

    expect(readLanguageLearningWords()).toEqual([])
  })
})
