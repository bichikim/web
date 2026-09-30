/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeEnglishSpeechText} from '../features/supertonic/number-speech/normalize-english-speech-text'
import {parseInteger} from '../features/supertonic/number-speech/parse-integer'

const FULLWIDTH_HYPHEN_MINUS = '\uFF0D'

describe('parseInteger fullwidth hyphen-minus (U+FF0D)', () => {
  it('should parse pasted negative integers with a fullwidth hyphen-minus sign', () => {
    expect(parseInteger(`${FULLWIDTH_HYPHEN_MINUS}12`)).toBe(-12n)
    expect(parseInteger(`${FULLWIDTH_HYPHEN_MINUS}5,000`)).toBe(-5_000n)
  })

  it('should still normalize Unicode minus sign (U+2212) separately', () => {
    expect(parseInteger('−7')).toBe(-7n)
  })
})

describe('normalizeEnglishSpeechText with fullwidth hyphen-minus', () => {
  it('should speak negative cardinals when the minus sign is fullwidth', () => {
    expect(normalizeEnglishSpeechText(`Temperature is ${FULLWIDTH_HYPHEN_MINUS}5 degrees.`)).toBe(
      'Temperature is minus five degrees.',
    )
  })
})
