/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizeSpeechText} from '../features/supertonic'

it('should read February calendar dates as 이월 instead of 이 월', () => {
  expect(normalizeSpeechText({language: 'ko', text: '2월 14일'})).toBe('이월 십사 일')
})
