/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {parseExpenseText} from '../components/dev/hwp/expense'

describe('parseExpenseText date line ordering', () => {
  it('should keep the first date when a second date line appears after items', () => {
    expect(parseExpenseText('2026-09-05\n두부 1,500원\n2026-09-06')).toEqual({
      ok: true,
      value: {
        date: '2026-09-05',
        items: [{amount: 1500, name: '두부', quantity: 1, unitPrice: 1500}],
        questions: [],
        total: 1500,
      },
    })
  })
})
