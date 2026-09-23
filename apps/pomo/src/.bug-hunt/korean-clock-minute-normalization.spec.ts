/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizeSpeechText} from '../features/supertonic/number-speech'

it('should normalize minutes in a clock time after 시', () => {
  expect(normalizeSpeechText({language: 'ko', text: '오후 4시 30분에 만나요.'})).toBe(
    '오후 네 시 삼십 분에 만나요.',
  )
})
