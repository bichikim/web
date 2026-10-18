/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {stripTrailingSymbols} from '..'

describe('stripTrailingSymbols', () => {
  it.each([
    '👋',
    '👩🏽‍💻',
    '👨‍👩‍👧‍👦',
    '❤️‍🔥',
    '🇺🇸',
    '™',
    '±',
    '🏽',
    '☀\uFE0E',
    '☀\uFE0F',
    '©\u20E0',
    '👋\uFE0F\uFE0E',
    '1\u20E3',
    '1\uFE0F\u20E3',
    '#\u20E3',
    '*\uFE0F\u20E3',
    '1\uFE0F\u20E3\uFE0F',
    '\u{1F3F4}\u{E0067}\u{E0062}\u{E007F}',
    '👩🏽\u{E0067}\u{E007F}',
    '👩\uFE0F\u{E0067}\u{E007F}',
    '👋\u200D1\uFE0F\u20E3',
    '👋\u200D\u{1F3F4}\u{E0067}\u{E007F}',
  ])('should remove the supported symbol suffix %j and adjacent Unicode whitespace', (suffix) => {
    expect(stripTrailingSymbols(`A title!\u00A0${suffix}\u2009\t`)).toBe('A title!')
  })

  it.each([
    '',
    '   ',
    'Plain text   ',
    'Emoji 👋 inside text',
    'Numeric 123',
    'Ending punctuation!?',
    '\u20E3',
    '\uFE0F\u20E3',
    '\u{E0067}\u{E007F}',
    '🏽\u{E0067}\u{E007F}',
  ])('should preserve input %j when no supported suffix can be removed', (value) =>
    expect(stripTrailingSymbols(value)).toBe(value),
  )

  it.each([
    '\u0301',
    '👋\u0301',
    '\uFE0F',
    '\u20E0',
    '\u20E3',
    'x\u20E3',
    '\u{E0067}',
    '\u{E007F}',
    '\u{E0067}\u{E007F}',
    '🏴\u{E0067}',
    '🏴\u{E007F}',
    'x\u{E0067}\u{E007F}',
    '👋\u200D',
    'a\u200D👋',
    '\u202E',
    '\u200B',
    '👋\uFEFF',
    '☀\uFE0E\u{E0067}\u{E007F}',
  ])('should preserve an unsupported or unresolved tail %j', (suffix) => {
    const value = `Text ${suffix}`
    expect(stripTrailingSymbols(value)).toBe(value)
  })

  it.each([
    ['Text\u0301 👋', 'Text\u0301'],
    ['Text\u200B 🎉', 'Text\u200B'],
    ['Text\uFEFF 👋', 'Text\uFEFF'],
  ])(
    'should stop at unsupported content when removing a later suffix from %j',
    (value, expected) => {
      expect(stripTrailingSymbols(value)).toBe(expected)
    },
  )

  it('should preserve leading whitespace and internal symbols', () => {
    expect(stripTrailingSymbols('  👋 Welcome! ™ + 🎉  ')).toBe('  👋 Welcome!')
  })

  it('should remove an input made entirely of supported symbols and whitespace', () => {
    expect(stripTrailingSymbols(' 👋 ™ 1️⃣ \t')).toBe('')
  })

  it('should preserve an unresolved joiner chain without removing the final symbol', () => {
    const value = `Text ${'\u200D'.repeat(10_000)}👋`
    expect(stripTrailingSymbols(value)).toBe(value)
  })

  it('should preserve unpaired surrogates outside the removed suffix', () => {
    expect(stripTrailingSymbols('\uD800Text\uDC00 👋')).toBe('\uD800Text\uDC00')
  })
})
