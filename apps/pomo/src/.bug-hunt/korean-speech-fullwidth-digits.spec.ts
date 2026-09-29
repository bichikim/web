/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizeSpeechText} from '../features/supertonic/number-speech/normalize-speech-text'

it('should pronounce a Korean won amount written with fullwidth digits', () => {
  expect(normalizeSpeechText({language: 'ko', text: '가격은 １２３４원입니다.'})).toBe(
    '가격은 천이백삼십사 원입니다.',
  )
})

it('should pronounce a native counter amount written with fullwidth digits', () => {
  expect(normalizeSpeechText({language: 'ko', text: '티켓 ３장을 샀어요.'})).toBe(
    '티켓 세 장을 샀어요.',
  )
})
