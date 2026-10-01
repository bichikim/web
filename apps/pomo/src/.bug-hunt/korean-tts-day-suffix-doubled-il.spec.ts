/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizeKoreanSpeechText} from '../features/supertonic/number-speech/normalize-korean-speech-text'

it('should not append a separate 일 suffix when the day number already ends with 일', () => {
  expect(normalizeKoreanSpeechText('11일')).toBe('십일')
  expect(normalizeKoreanSpeechText('21일')).toBe('이십일')
  expect(normalizeKoreanSpeechText('31일')).toBe('삼십일')
})

it('should read the first day of the month without splitting 일 into two tokens', () => {
  expect(normalizeKoreanSpeechText('1일')).toBe('일일')
  expect(normalizeKoreanSpeechText('3월 1일')).toBe('삼 월 일일')
})
