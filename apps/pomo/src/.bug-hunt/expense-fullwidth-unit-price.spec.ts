/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseText} from '../components/dev/hwp/expense'

it('should parse expense lines pasted with fullwidth digits in unit price', () => {
  expect(parseExpenseText('두부 1,500원')).toMatchObject({
    ok: true,
    value: {items: [{unitPrice: 1500}], total: 1500},
  })

  expect(parseExpenseText('두부 １,５００원')).toMatchObject({
    ok: true,
    value: {items: [{unitPrice: 1500}], total: 1500},
  })

  expect(parseExpenseText('두부 １５００원')).toMatchObject({
    ok: true,
    value: {items: [{unitPrice: 1500}], total: 1500},
  })
})
