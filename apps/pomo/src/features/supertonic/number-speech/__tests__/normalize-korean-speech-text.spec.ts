/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeKoreanSpeechText} from '../normalize-korean-speech-text'

describe('normalizeKoreanSpeechText', () => {
  it.each([
    ['11월 15일', '십일월 십오 일'],
    ['12월 31일', '십이월 삼십일 일'],
    ['１１월 15일', '십일월 십오 일'],
    ['１２월 31일', '십이월 삼십일 일'],
  ])('should keep %s as a joined Korean calendar month name', (text, expected) => {
    expect(normalizeKoreanSpeechText(text)).toBe(expected)
  })
})
