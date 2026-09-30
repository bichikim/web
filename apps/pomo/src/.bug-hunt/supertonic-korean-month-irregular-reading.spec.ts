/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeSpeechText} from '../features/supertonic/number-speech/normalize-speech-text'

describe('Korean month speech should use irregular readings for June and October', () => {
  it.each([
    ['6월 10일에 만나요.', '유월 십 일에 만나요.'],
    ['10월 3일은 개천절이에요.', '시월 삼 일은 개천절이에요.'],
  ])('should read %s as %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })
})
