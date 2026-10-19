/** @vitest-environment node */
import {expect, it} from 'vitest'
import {escapeXmlValue} from '../escape-xml-value.mjs'

it.each([
  {expected: '', value: ''},
  {expected: 'plain text', value: 'plain text'},
  {expected: '&amp;&lt;&gt;&quot;&apos;', value: '&<>"\''},
  {expected: '&amp;amp; &amp;#39; &amp;unknown;', value: '&amp; &#39; &unknown;'},
  {expected: '한글 😀 \u0000\t\n', value: '한글 😀 \u0000\t\n'},
  {expected: '\ud800&amp;\udc00', value: '\ud800&\udc00'},
])('should escape delimiters and preserve other code units in $value', ({expected, value}) => {
  expect(escapeXmlValue(value)).toBe(expected)
})
