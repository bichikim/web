/** @vitest-environment node */
import {expect, it} from 'vitest'

import {
  isValidLanguageLearningSentence,
  normalizeLanguageLearningSentence,
} from '../features/language-learning/sentence'

it('should not strip mismatched quote wrappers in a way that drops the sentence ending', () => {
  const raw = '"hello\''

  expect(normalizeLanguageLearningSentence(raw)).toBe('hello.')
  expect(isValidLanguageLearningSentence(normalizeLanguageLearningSentence(raw), 'en')).toBe(true)
})
