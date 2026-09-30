/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  isValidLanguageLearningSentence,
  normalizeLanguageLearningSentence,
} from '../features/language-learning/sentence'

describe('normalizeLanguageLearningSentence fullwidth quote wrapper', () => {
  it('should strip fullwidth double quotes from model output', () => {
    const input = `\uFF02hello.\uFF02`
    const normalized = normalizeLanguageLearningSentence(input)

    expect(isValidLanguageLearningSentence('hello.', 'en')).toBe(true)
    expect(normalized).toBe('hello.')
    expect(isValidLanguageLearningSentence(normalized, 'en')).toBe(true)
  })
})
