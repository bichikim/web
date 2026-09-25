import {describe, expect, it} from 'vitest'

import {isValidLanguageLearningSentence} from '../sentence'

describe('isValidLanguageLearningSentence', () => {
  it('should accept decimal points in Korean and Japanese sentences', () => {
    expect(isValidLanguageLearningSentence('원주율은 3.14로 계산해요.', 'ko')).toBe(true)
    expect(isValidLanguageLearningSentence('円周率は3.14として計算します。', 'ja')).toBe(true)
  })

  it('should reject multiple Korean and Japanese sentences', () => {
    expect(isValidLanguageLearningSentence('원주율은 3.14예요. 오늘은 날씨가 좋아요.', 'ko')).toBe(
      false,
    )
    expect(
      isValidLanguageLearningSentence('円周率は3.14です。今日はよく晴れています。', 'ja'),
    ).toBe(false)
  })
})
