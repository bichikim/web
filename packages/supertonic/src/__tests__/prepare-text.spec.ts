import {afterEach, expect, it, vi} from 'vitest'
import {prepareText} from '@winter-love/supertonic/prepare-text'

afterEach(() => vi.restoreAllMocks())

it('should normalize model input while preserving decomposed letters and closing quotes', () => {
  expect(prepareText('  “é–한글😀”\n', 'ko')).toBe(
    '<ko>"e\u0301-\u1112\u1161\u11ab\u1100\u1173\u11af"</ko>',
  )
})

it.each([
  {input: '', output: '.'},
  {input: ' \t\n\u00a0', output: '.'},
  {input: '♥☆♡©\\😀🇰🇷', output: '.'},
  {input: '[A]_|/#→←B', output: 'A B.'},
  {input: 'A—B‑C–D', output: 'A-B\u2010C-D.'},
  {input: 'Hello?', output: 'Hello?'},
  {input: '𝄞', output: '𝄞.'},
])('should prepare $input as $output', ({input, output}) => {
  expect(prepareText(input, 'en')).toBe(`<en>${output}</en>`)
})

it('should retain the selected model language token', () => {
  expect(prepareText('こんにちは', 'ja')).toBe('<ja>こんにちは.</ja>')
  expect(prepareText('Hello', 'na')).toBe('<na>Hello.</na>')
})

it('should propagate a normalization failure without replacing its error', () => {
  const expectedError = new Error('normalization failed')
  vi.spyOn(String.prototype, 'normalize').mockImplementation(() => {
    throw expectedError
  })

  expect.assertions(1)
  try {
    prepareText('Hello', 'en')
  } catch (error: unknown) {
    expect(error).toBe(expectedError)
  }
})
