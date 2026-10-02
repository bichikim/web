/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseText} from '../components/dev/hwp/expense'

it('should parse an expense date line pasted with fullwidth digits', () => {
  const expected = parseExpenseText('2026-09-05\n두부 1,500원')

  expect(parseExpenseText('２０２６-０９-０５\n두부 1,500원')).toEqual(expected)
})
