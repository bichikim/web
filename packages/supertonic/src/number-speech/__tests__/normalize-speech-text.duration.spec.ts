/** @vitest-environment jsdom */
import {expect, it} from 'vitest'
import {normalizeSpeechText} from '@winter-love/supertonic/number-speech/index'

it.each([
  ['０５분 남았어요.', '오 분 남았어요.'],
  ['０5분 남았어요.', '오 분 남았어요.'],
  ['10분 후 시작해요.', '십 분 후 시작해요.'],
  ['１０분 후 시작해요.', '십 분 후 시작해요.'],
  ['05분 후 시작해요.', '05분 후 시작해요.'],
  ['０５분 후 시작해요.', '０５분 후 시작해요.'],
  ['0５분 후 시작해요.', '0５분 후 시작해요.'],
  ['００５분 남았어요.', '００５분 남았어요.'],
  ['-１０분 후 시작해요.', '-１０분 후 시작해요.'],
  ['１０，０００분 후 시작해요.', '１０，０００분 후 시작해요.'],
  ['https://example.com/１０분 후 시작해요.', 'https://example.com/１０분 후 시작해요.'],
  ['먼저 ０５분 남았고 １０분 후 시작해요.', '먼저 오 분 남았고 십 분 후 시작해요.'],
])('should retain the duration padding contract across digit widths: %s', (text, expected) => {
  expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
})
