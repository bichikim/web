/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeKoreanSpeechText} from '../features/supertonic/number-speech/normalize-korean-speech-text'

describe('Korean TTS colon clock times', () => {
  it('should normalize HH:MM clock expressions for speech', () => {
    expect(normalizeKoreanSpeechText('09:05에 시작합니다.')).toBe('아홉 시 오 분에 시작합니다.')
    expect(normalizeKoreanSpeechText('12:30에 만나요.')).toBe('열두 시 삼십 분에 만나요.')
  })
})
