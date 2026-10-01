/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeKoreanSpeechText} from '../features/supertonic/number-speech/normalize-korean-speech-text'

describe('Korean TTS leading-zero clock and duration', () => {
  it('should pronounce zero-padded hours and minutes in 시·분 expressions', () => {
    expect(normalizeKoreanSpeechText('09시 30분에 만나요.')).toBe('아홉 시 삼십 분에 만나요.')
    expect(normalizeKoreanSpeechText('12시 05분에 만나요.')).toBe('열두 시 오 분에 만나요.')
    expect(normalizeKoreanSpeechText('오전 09시 05분에 만나요.')).toBe(
      '오전 아홉 시 오 분에 만나요.',
    )
  })

  it('should pronounce zero-padded minute durations before 남', () => {
    expect(normalizeKoreanSpeechText('05분 남았어요.')).toBe('오 분 남았어요.')
  })
})
