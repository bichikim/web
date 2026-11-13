/** @vitest-environment node */

import {describe, expect, it} from 'vitest'
import {escapeXmlAttribute, escapeXmlText} from '../escape-xml'

const ALLOWED_POINTS = [
  0x9, 0xa, 0xd, 0x20, 0x7f, 0x85, 0xd7ff, 0xe000, 0xfdd0, 0xfffd, 0x10000, 0x1fffe, 0x1ffff,
  0x10fffe, 0x10ffff,
]
const DISALLOWED_POINTS = [0, 8, 0xb, 0xc, 0x1f, 0xd800, 0xdbff, 0xdc00, 0xdfff, 0xfffe, 0xffff]

describe.each([
  {escape: escapeXmlText, name: 'escapeXmlText'},
  {escape: escapeXmlAttribute, name: 'escapeXmlAttribute'},
])('$name', ({escape}) => {
  it.each(ALLOWED_POINTS)('should retain XML 1.0 character code point %i', (point) => {
    const character = String.fromCodePoint(point)
    expect(escape(character)).toBe(character)
  })

  it.each(DISALLOWED_POINTS)('should remove XML 1.0-disallowed code point %i', (point) => {
    expect(escape(`before${String.fromCodePoint(point)}after`)).toBe('beforeafter')
  })

  it('should retain valid surrogate pairs without joining separated invalid surrogates', () => {
    expect(escape('\ud800\u0000\udc00')).toBe('')
    expect(escape('\ud800\ud800\udc00\udfff')).toBe('\ud800\udc00')
    expect(escape('가 e\u0301 👨‍👩‍👧‍👦')).toBe('가 e\u0301 👨‍👩‍👧‍👦')
  })

  it('should keep empty input and repeated calls independent', () => {
    expect(escape('\u0000')).toBe('')
    expect(escape('')).toBe('')
    expect(escape('second')).toBe('second')
  })
})

describe('markup escaping', () => {
  it('should preserve quotes in text and escape ampersands before angle brackets', () => {
    expect(escapeXmlText(`&amp;<tag>"'`)).toBe(`&amp;amp;&lt;tag&gt;"'`)
  })

  it('should escape both quote forms only for attribute values', () => {
    expect(escapeXmlAttribute(`&amp;<tag>"'`)).toBe('&amp;amp;&lt;tag&gt;&quot;&apos;')
  })
})
