/** @vitest-environment node */
import {expect, it} from 'vitest'
import {countText} from '../text'

it.each([
  {expected: {bytes: 0, characters: 0, withoutSpaces: 0}, text: ''},
  {expected: {bytes: 6, characters: 4, withoutSpaces: 2}, text: '가 A\n'},
  {expected: {bytes: 25, characters: 1, withoutSpaces: 1}, text: '👨‍👩‍👧‍👦'},
  {expected: {bytes: 6, characters: 1, withoutSpaces: 1}, text: '가'},
  {expected: {bytes: 3, characters: 1, withoutSpaces: 1}, text: 'e\u0301'},
  {expected: {bytes: 16, characters: 2, withoutSpaces: 2}, text: '👍🏽🇰🇷'},
  {expected: {bytes: 2, characters: 1, withoutSpaces: 0}, text: '\r\n'},
  {
    expected: {bytes: 17, characters: 6, withoutSpaces: 0},
    text: '\u00a0\u2003\u2028\u2029\u3000\ufeff',
  },
  {expected: {bytes: 5, characters: 2, withoutSpaces: 2}, text: '\u0085\u200b'},
  {expected: {bytes: 3, characters: 1, withoutSpaces: 1}, text: ' \u0301'},
  {expected: {bytes: 3, characters: 1, withoutSpaces: 1}, text: '\ud800'},
])(
  'should count graphemes, whole whitespace segments and UTF-8 bytes for $text',
  ({text, expected}) => {
    expect(countText(text)).toEqual(expected)
  },
)

it('should keep repeated calls independent', () => {
  const first = countText('가 👨‍👩‍👧‍👦')
  expect(countText('')).toEqual({bytes: 0, characters: 0, withoutSpaces: 0})
  expect(countText('A')).toEqual({bytes: 1, characters: 1, withoutSpaces: 1})
  expect(first).toEqual({bytes: 29, characters: 3, withoutSpaces: 2})
})
