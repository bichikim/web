import {describe, expect, it} from 'vitest'

import {normalizeEnglishSpeechText} from '../index'

const FULLWIDTH_HYPHEN_MINUS = '\uFF0D'

describe('normalizeEnglishSpeechText', () => {
  it.each(['children', 'feet', 'men', 'mice', 'people', 'teeth', 'women', 'devices'])(
    'should pronounce a quantity before %s',
    (noun) => {
      expect(normalizeEnglishSpeechText(`3 ${noun}`)).toBe(`three ${noun}`)
    },
  )

  it.each([
    ['3 women,', 'three women,'],
    ['3\nchildren', 'three\nchildren'],
    ['3\tmice', 'three\tmice'],
  ])('should preserve noun spacing and punctuation in %s', (text, expected) => {
    expect(normalizeEnglishSpeechText(text)).toBe(expected)
  })

  it.each(['3 womenA', '3 Women', '3 child', 'Room 3 women', '007 women', '2026 women'])(
    'should preserve an unsupported or non-quantity phrase in %s',
    (text) => {
      expect(normalizeEnglishSpeechText(text)).toBe(text)
    },
  )

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
