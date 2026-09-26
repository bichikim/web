/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseAssistantResponse, parseExpenseText} from '../components/dev/hwp/expense'

it('should accept unpadded civil dates in assistant JSON like the text parser', () => {
  const payload = {
    date: '2026-9-5',
    items: [{name: '두부', quantity: 1, unitPrice: 1500}],
    questions: [],
  }

  expect(parseExpenseText('2026-9-5\n두부 1,500원')).toMatchObject({
    ok: true,
    value: {date: '2026-9-5'},
  })

  expect(parseExpenseAssistantResponse(JSON.stringify(payload))).toEqual({
    ok: true,
    value: {
      date: '2026-9-5',
      items: [{amount: 1500, name: '두부', quantity: 1, unitPrice: 1500}],
      questions: [],
      total: 1500,
    },
  })
})
