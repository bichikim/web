/** @vitest-environment node */
import {expect, it} from 'vitest'

import {normalizePasteNumericInput} from '../index'

it('should normalize pasted numeric signs, fullwidth digits, and commas', () => {
  expect(normalizePasteNumericInput('１２＋３４－５−６，７８')).toBe('12+34-5-6,78')
  expect(normalizePasteNumericInput('1,000')).toBe('1,000')
})

it('should leave unrelated fullwidth punctuation and letters unchanged', () => {
  expect(normalizePasteNumericInput('Ａ．')).toBe('Ａ．')
})
