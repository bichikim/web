/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {isValidLanguageLearningSentence} from '../features/language-learning/sentence'

describe('language learning sentence validation (ko abbreviations)', () => {
  it('should accept a single Korean sentence with a Latin abbreviation before more text', () => {
    expect(isValidLanguageLearningSentence('Dr. Kim은 의사예요.', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('예를 들어 e.g. 이렇게 말해요.', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('이것은 U.S. 이야기예요.', 'ko')).toBe(true)
  })
})
