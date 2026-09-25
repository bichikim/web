/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {isValidLanguageLearningSentence} from '../features/language-learning/sentence'

describe('language learning decimal sentences', () => {
  it('should accept Korean and Japanese sentences that contain decimal points', () => {
    expect(isValidLanguageLearningSentence('3.14은 좋습니다.', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('버전 2.0을 씁니다.', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('3.14はいいです。', 'ja')).toBe(true)
  })

  it('should still reject multiple Korean sentences', () => {
    expect(isValidLanguageLearningSentence('안녕. 또 봐.', 'ko')).toBe(false)
  })
})
