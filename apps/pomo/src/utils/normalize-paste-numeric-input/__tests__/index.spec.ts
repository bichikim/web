/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizePasteNumericInput} from '../index'

it('should normalize pasted numeric signs, fullwidth digits, and commas', () => {
  expect(normalizePasteNumericInput('１２＋３４－５−６，７８')).toBe('12+34-5-6,78')
  expect(normalizePasteNumericInput('1,000')).toBe('1,000')
})

it.each([
  ['en dash (U+2013)', '–'],
  ['figure dash (U+2012)', '‒'],
  ['small hyphen-minus (U+FE63)', '﹣'],
] as const)('should normalize a leading %s to an ASCII minus sign', (_label, dash) => {
  expect(normalizePasteNumericInput(` \t${dash}５`)).toBe(' \t-5')
})

it.each([
  ['en dash (U+2013)', '–'],
  ['figure dash (U+2012)', '‒'],
  ['small hyphen-minus (U+FE63)', '﹣'],
] as const)('should preserve an internal %s as range punctuation', (_label, dash) => {
  const value = `5${dash}2`

  expect(normalizePasteNumericInput(value)).toBe(value)
})

it('should leave unrelated fullwidth punctuation and letters unchanged', () => {
  expect(normalizePasteNumericInput('Ａ．')).toBe('Ａ．')
})
