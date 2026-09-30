/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeKoreanSpeechStyle} from '../features/dialogue-writer/answer'

describe('normalizeKoreanSpeechStyle parenthesis and ellipsis endings', () => {
  it('should convert formal endings inside ASCII parentheses', () => {
    expect(normalizeKoreanSpeechStyle('(도움이 됩니다)')).toBe('(도움이 돼요)')
  })

  it('should convert formal endings before a Unicode ellipsis', () => {
    expect(normalizeKoreanSpeechStyle('잠시만 기다려 주십니다…')).toBe('잠시만 기다려 주세요…')
  })

  it('should convert formal endings before a fullwidth closing parenthesis', () => {
    expect(normalizeKoreanSpeechStyle('알겠습니다）')).toBe('알겠어요）')
  })
})
