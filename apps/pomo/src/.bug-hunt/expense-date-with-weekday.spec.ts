/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseText} from '../components/dev/hwp/expense'

it('should parse a date line with a trailing weekday label', () => {
  expect(parseExpenseText('2026-09-05 금요일\n두부 1,500원')).toMatchObject({
    ok: true,
    value: {date: '2026-09-05', items: [{name: '두부', amount: 1500}], total: 1500},
  })
})
