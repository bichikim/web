/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {parseExpenseAssistantResponse, parseExpenseText} from '../expense'

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

  it('should parse fullwidth digits in date lines and keep the first date', () => {
    const expected = parseExpenseText('2026-09-05\n2026-09-06\n두부２ 1,500원')

    expect(parseExpenseText('２０２６-０９-０５\n2026-09-06\n두부２ 1,500원')).toEqual(expected)
    expect(expected).toMatchObject({
      ok: true,
      value: {
        date: '2026-09-05',
        items: [{amount: 1500, name: '두부２', quantity: 1, unitPrice: 1500}],
        total: 1500,
      },
    })
    expect(parseExpenseText('２０２６-９-５\n두부 1,500원')).toEqual(
      parseExpenseText('2026-9-5\n두부 1,500원'),
    )
  })

  it('should normalize fullwidth digits in unit-price tokens only', () => {
    const asciiResult = parseExpenseText('2026-09-05\n두부２ 1,500원')

    expect(parseExpenseText('2026-09-05\n두부２ １,５００원')).toEqual(asciiResult)
    expect(parseExpenseText('2026-09-05\n두부２ １５００원')).toEqual(asciiResult)
    expect(asciiResult).toMatchObject({
      ok: true,
      value: {
        date: '2026-09-05',
        items: [{amount: 1500, name: '두부２', quantity: 1, unitPrice: 1500}],
        total: 1500,
      },
    })
  })

  it('should not normalize fullwidth digits in quantities or separators', () => {
    expect(parseExpenseText('두부 1,500원 ２개')).toEqual({
      error: {code: 'invalid-input'},
      ok: false,
    })
    expect(parseExpenseText('두부 １，５００원')).toEqual({
      error: {code: 'invalid-input'},
      ok: false,
    })
  })

  it('should retain positive, safe-integer, item-overflow, and total-overflow checks', () => {
    const maximumSafePrice = '９００７１９９２５４７４０９９１'

    expect(parseExpenseText(`상품 ${maximumSafePrice}원`)).toMatchObject({
      ok: true,
      value: {
        items: [{amount: Number.MAX_SAFE_INTEGER, quantity: 1, unitPrice: Number.MAX_SAFE_INTEGER}],
        total: Number.MAX_SAFE_INTEGER,
      },
    })
    expect(parseExpenseText('상품 ０원')).toEqual({error: {code: 'invalid-input'}, ok: false})
    expect(parseExpenseText('상품 ９００７１９９２５４７４０９９２원')).toEqual({
      error: {code: 'invalid-input'},
      ok: false,
    })
    expect(parseExpenseText(`상품 ${maximumSafePrice}원 2개`)).toEqual({
      error: {code: 'invalid-input'},
      ok: false,
    })
    expect(parseExpenseText(`상품 ${maximumSafePrice}원\n추가 1원`)).toEqual({
      error: {code: 'invalid-input'},
      ok: false,
    })
  })

  it('should parse a date line with a trailing weekday label', () => {
    expect(parseExpenseText('2026-09-05 금요일\n두부 1,500원')).toMatchObject({
      ok: true,
      value: {date: '2026-09-05', items: [{amount: 1500, name: '두부'}], total: 1500},
    })
  })

  it('should keep the first date and ignore later date lines', () => {
    expect(parseExpenseText('2026-09-05\n2026-09-06\n두부 1,500원')).toMatchObject({
      ok: true,
      value: {
        date: '2026-09-05',
        items: [{amount: 1500, name: '두부', quantity: 1, unitPrice: 1500}],
      },
    })
  })

  it('should preserve support for unpadded date parts', () => {
    expect(parseExpenseText('2026-9-5\n두부 1,500원')).toMatchObject({
      ok: true,
      value: {date: '2026-9-5'},
    })
  })

  it('should reject a civil date that does not exist', () => {
    expect(parseExpenseText('2026-02-30\n두부 1,500원')).toEqual({
      error: {code: 'invalid-input'},
      ok: false,
    })
    expect(parseExpenseText('２０２６-０２-３０\n두부 1,500원')).toEqual({
      error: {code: 'invalid-input'},
      ok: false,
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

describe('parseExpenseAssistantResponse', () => {
  it.each([[null], [[]], [false], [42], ['두부']])(
    'should reject a non-object structured item: %j',
    (item) => {
      expect(parseExpenseAssistantResponse(JSON.stringify({items: [item]}))).toEqual({
        error: {code: 'invalid-shape'},
        ok: false,
      })
    },
  )

  it.each([
    [Number.MAX_SAFE_INTEGER - 1, {ok: true, value: {total: Number.MAX_SAFE_INTEGER}}],
    [Number.MAX_SAFE_INTEGER, {error: {code: 'invalid-shape'}, ok: false}],
  ])(
    'should preserve the structured total boundary for a unit price of %i',
    (unitPrice, result) => {
      expect(
        parseExpenseAssistantResponse(
          JSON.stringify({
            items: [
              {name: '식사', quantity: 1, unitPrice},
              {name: '차', quantity: 1, unitPrice: 1},
            ],
          }),
        ),
      ).toMatchObject(result)
    },
  )

  it.each([undefined, null, '', '   ', '\t\n', '\u3000'])(
    'should treat an absent or blank date as missing: %j',
    (date) => {
      const result = parseExpenseAssistantResponse(
        JSON.stringify({
          date,
          items: [{name: '두부', quantity: 1, unitPrice: 1500}],
          questions: ['단가를 확인해 주세요.'],
        }),
      )

      expect(result).toEqual({
        ok: true,
        value: {
          date: null,
          items: [{amount: 1500, name: '두부', quantity: 1, unitPrice: 1500}],
          questions: ['단가를 확인해 주세요.'],
          total: 1500,
        },
      })
    },
  )

  it.each([0, false, [], {}])('should reject a non-string date: %j', (date) => {
    expect(
      parseExpenseAssistantResponse(
        JSON.stringify({
          date,
          items: [{name: '두부', quantity: 1, unitPrice: 1500}],
        }),
      ),
    ).toEqual({error: {code: 'invalid-shape'}, ok: false})
  })

  it.each([
    {name: '', quantity: 1, unitPrice: 1500},
    {name: '두부', quantity: 0, unitPrice: 1500},
    {name: '두부', quantity: 1, unitPrice: 0},
  ])('should still reject invalid items with a blank date: %j', (item) => {
    expect(parseExpenseAssistantResponse(JSON.stringify({date: '', items: [item]}))).toEqual({
      error: {code: 'invalid-shape'},
      ok: false,
    })
  })

  it('should reject fullwidth digits in structured date values', () => {
    expect(
      parseExpenseAssistantResponse(
        '{"date":"２０２６-０９-０５","items":[{"name":"두부","quantity":1,"unitPrice":1500}]}',
      ),
    ).toEqual({
      error: {code: 'invalid-shape'},
      ok: false,
    })
  })

  it('should parse JSON after brace-delimited prose', () => {
    expect(
      parseExpenseAssistantResponse(
        '메모 {참고} {"date":"2026-09-05","items":[{"name":"두부 {냉장}","quantity":1,"unitPrice":1500}]}',
      ),
    ).toEqual({
      ok: true,
      value: {
        date: '2026-09-05',
        items: [{amount: 1500, name: '두부 {냉장}', quantity: 1, unitPrice: 1500}],
        questions: [],
        total: 1500,
      },
    })
  })

  it('should skip unrelated JSON objects before the expense response', () => {
    expect(
      parseExpenseAssistantResponse(
        '메모 {"type":"note"} {"date":"2026-09-05","items":[{"name":"두부","quantity":1,"unitPrice":1500}]}',
      ),
    ).toMatchObject({
      ok: true,
      value: {date: '2026-09-05', items: [{name: '두부'}], total: 1500},
    })
  })

  it('should reject an expense-shaped object nested in unrelated valid JSON', () => {
    expect(
      parseExpenseAssistantResponse(
        '메모 {"example":{"date":"2026-09-05","items":[{"name":"두부","quantity":1,"unitPrice":1500}]}}',
      ),
    ).toEqual({
      error: {code: 'invalid-shape'},
      ok: false,
    })
  })

  it('should preserve an unpadded date', () => {
    expect(
      parseExpenseAssistantResponse(
        JSON.stringify({
          date: '2026-9-5',
          items: [{name: '두부', quantity: 1, unitPrice: 1500}],
          questions: [],
        }),
      ),
    ).toMatchObject({
      ok: true,
      value: {date: '2026-9-5'},
    })
  })

  it('should reject a civil date that does not exist', () => {
    expect(
      parseExpenseAssistantResponse(
        JSON.stringify({
          date: '2026-02-30',
          items: [{name: '두부', quantity: 1, unitPrice: 1500}],
        }),
      ),
    ).toEqual({
      error: {code: 'invalid-shape'},
      ok: false,
    })
  })
})
