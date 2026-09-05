import {describe, expect, it} from 'vitest'

import {parseExpenseText} from '../expense'

describe('parseExpenseText', () => {
  it('should parse clear Korean expense lines with quantities', () => {
    expect(parseExpenseText('당근 2000원\n고구마 1000원 2개')).toEqual({
      ok: true,
      value: {
        date: null,
        items: [
          {amount: 2000, name: '당근', quantity: 1, unitPrice: 2000},
          {amount: 2000, name: '고구마', quantity: 2, unitPrice: 1000},
        ],
        questions: [],
        total: 4000,
      },
    })
  })

  it('should parse an optional date and comma-separated prices', () => {
    expect(parseExpenseText('2026-09-05\n두부 1,500원')).toMatchObject({
      ok: true,
      value: {
        date: '2026-09-05',
        items: [{amount: 1500, name: '두부', quantity: 1, unitPrice: 1500}],
        total: 1500,
      },
    })
  })

  it('should reject a line without an explicit price', () => {
    expect(parseExpenseText('고구마 많이 샀음')).toEqual({
      error: {code: 'invalid-input'},
      ok: false,
    })
  })

  it('should reject an amount that exceeds safe integer precision', () => {
    expect(parseExpenseText('상품 9,007,199,254,740,991원 2개')).toEqual({
      error: {code: 'invalid-input'},
      ok: false,
    })
  })
})
