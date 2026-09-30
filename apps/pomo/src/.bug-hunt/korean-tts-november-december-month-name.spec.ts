/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeSpeechText} from '../features/supertonic'

describe('Korean TTS month names for November and December', () => {
  it('should read 11월 as 십일월 without a spurious space before 월', () => {
    expect(normalizeSpeechText({language: 'ko', text: '11월 15일'})).toBe('십일월 십오 일')
  })

  it('should read 12월 as 십이월 without a spurious space before 월', () => {
    expect(normalizeSpeechText({language: 'ko', text: '12월 31일'})).toBe('십이월 삼십일 일')
  })
})
