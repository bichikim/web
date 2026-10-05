import {describe, expect, it} from 'vitest'

import {normalizeEnglishSpeechText} from '../index'

const FULLWIDTH_HYPHEN_MINUS = '\uFF0D'

describe('normalizeEnglishSpeechText', () => {
  it.each([
    ['ASCII hyphen-minus', '-5'],
    ['Unicode minus', '−5'],
    ['fullwidth hyphen-minus', `${FULLWIDTH_HYPHEN_MINUS}5`],
  ])('should pronounce negative counts with %s', (_description, value) => {
    expect(normalizeEnglishSpeechText(`Temperature is ${value} degrees.`)).toBe(
      'Temperature is minus five degrees.',
    )
  })

  it('should pronounce negative percentages with a fullwidth hyphen-minus', () => {
    expect(normalizeEnglishSpeechText(`${FULLWIDTH_HYPHEN_MINUS}5%`)).toBe('minus five percent')
  })
})
