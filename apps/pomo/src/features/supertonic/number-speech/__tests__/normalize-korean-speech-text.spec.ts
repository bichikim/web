/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeKoreanSpeechText} from '../normalize-korean-speech-text'

describe('normalizeKoreanSpeechText', () => {
  it('should pronounce colon clock times in Korean time contexts', () => {
    expect(normalizeKoreanSpeechText('09:05에 시작합니다.')).toBe('아홉 시 오 분에 시작합니다.')
    expect(normalizeKoreanSpeechText('12:30에 만나요.')).toBe('열두 시 삼십 분에 만나요.')
    expect(normalizeKoreanSpeechText('오전 09:05에 만나요.')).toBe('오전 아홉 시 오 분에 만나요.')
    expect(normalizeKoreanSpeechText('오전 09:05')).toBe('오전 아홉 시 오 분')
    expect(normalizeKoreanSpeechText('오전 09:05 시작합니다.')).toBe(
      '오전 아홉 시 오 분 시작합니다.',
    )
    expect(normalizeKoreanSpeechText('０９:０５에 만나요.')).toBe('아홉 시 오 분에 만나요.')
    expect(normalizeKoreanSpeechText('00:00에, 23:59에')).toBe(
      '영 시 영 분에, 이십삼 시 오십구 분에',
    )
  })

  it('should preserve invalid, structured, and context-free colon numbers', () => {
    const text =
      '24:00에, 12:60에, 오전 00:00에, 오후 13:00에, 124:05에, 09:051에, v09:05에, 1.09:05에, ' +
      '09:05:30에, https://example.com/09:05에, https://example.com/?time=09:05에, ' +
      '비율 09:05, 버전 09:05. 비율 09:05에, 버전 오전 09:05에, aspect ratio 09:05에.'

    expect(normalizeKoreanSpeechText(text)).toBe(text)
  })
})
