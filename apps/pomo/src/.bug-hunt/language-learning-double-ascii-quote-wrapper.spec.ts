/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  isValidLanguageLearningSentence,
  normalizeLanguageLearningSentence,
} from '../features/language-learning/sentence'

describe('normalizeLanguageLearningSentence double ASCII quote wrapper', () => {
  it('should accept model output wrapped in double quotes around single-quoted text', () => {
    const input = "\"'hello.'\""
    const normalized = normalizeLanguageLearningSentence(input)

    expect(isValidLanguageLearningSentence('hello.', 'en')).toBe(true)
    expect(normalized).toBe('hello.')
    expect(isValidLanguageLearningSentence(normalized, 'en')).toBe(true)
  })
})
