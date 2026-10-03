/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeSpeechText} from '../features/supertonic/number-speech'

describe('Korean TTS fullwidth duration minutes', () => {
  it('should normalize remaining-duration phrases with fullwidth digits', () => {
    expect(normalizeSpeechText({language: 'ko', text: '０５분 남았어요.'})).toBe('오 분 남았어요.')
    expect(normalizeSpeechText({language: 'ko', text: '１０분 남았어요.'})).toBe('십 분 남았어요.')
  })

  it('should normalize duration minutes before 후 with fullwidth digits', () => {
    expect(normalizeSpeechText({language: 'ko', text: '１０분 후 시작해요.'})).toBe(
      '십 분 후 시작해요.',
    )
  })
})
