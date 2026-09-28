/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizeKoreanSpeechText} from '../features/supertonic/number-speech/normalize-korean-speech-text'
import {parseInteger} from '../features/supertonic/number-speech/parse-integer'

it('should parse integers prefixed with the Unicode minus sign', () => {
  expect(parseInteger('\u22125')).toBe(-5n)
})

it('should normalize Korean speech that uses the Unicode minus sign', () => {
  expect(normalizeKoreanSpeechText('온도는 \u22125도입니다.')).toBe('온도는 마이너스 오 도입니다.')
})
