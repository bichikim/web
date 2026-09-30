/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizeKoreanSpeechStyle} from '../features/dialogue-writer/answer'

it('should convert 테니까 at end of string without trailing punctuation', () => {
  expect(normalizeKoreanSpeechStyle('힘이 생길 테니까')).toBe('힘이 생길 테니까요')
})
