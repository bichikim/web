/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeKoreanSpeechStyle} from '../features/dialogue-writer/answer'

describe('normalizeKoreanSpeechStyle punctuation gaps', () => {
  it('should convert formal endings before a comma into spoken honorifics', () => {
    expect(normalizeKoreanSpeechStyle('좋습니다, 계속해 보세요.')).toBe('좋아요, 계속해 보세요.')
  })

  it('should convert 테니까 before a comma into spoken honorifics', () => {
    expect(normalizeKoreanSpeechStyle('힘이 생길 테니까, 계속하세요.')).toBe(
      '힘이 생길 테니까요, 계속하세요.',
    )
  })

  it('should convert 건가 before a fullwidth question mark', () => {
    expect(normalizeKoreanSpeechStyle('이게 건가？')).toBe('이게 건가요？')
  })

  it('should convert 일까 before a fullwidth question mark', () => {
    expect(normalizeKoreanSpeechStyle('시작할까？')).toBe('시작할까요？')
  })
})
