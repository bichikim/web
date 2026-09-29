/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizeKoreanSpeechStyle} from '../features/dialogue-writer/answer'

it('should normalize 테니까 before a comma like other spoken endings', () => {
  expect(normalizeKoreanSpeechStyle('힘이 생길 테니까, 계속해요.')).toBe(
    '힘이 생길 테니까요, 계속해요.',
  )
})
