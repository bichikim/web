/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {isValidLanguageLearningSentence} from '../features/language-learning/sentence'

describe('language learning sentence validation (trailing emoji)', () => {
  it('should accept a single sentence when terminal punctuation is followed by trailing emoji', () => {
    expect(isValidLanguageLearningSentence('Hello world! 👋', 'en')).toBe(true)
    expect(isValidLanguageLearningSentence('원주율은 3.14예요! 🎉', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('今日は晴れです。☀️', 'ja')).toBe(true)
  })
})
