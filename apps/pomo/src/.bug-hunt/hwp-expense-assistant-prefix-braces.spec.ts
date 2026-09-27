/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {parseExpenseAssistantResponse} from '../components/dev/hwp/expense'

describe('parseExpenseAssistantResponse prefix braces', () => {
  it('should parse JSON after unrelated braces in the assistant prose', () => {
    const payload = {
      date: '2026-09-05',
      items: [{name: '두부', quantity: 1, unitPrice: 1500}],
      questions: [],
    }

    expect(
      parseExpenseAssistantResponse(`메모 {참고} ${JSON.stringify(payload)}`),
    ).toMatchObject({
      ok: true,
      value: {
        date: '2026-09-05',
        items: [{amount: 1500, name: '두부', quantity: 1, unitPrice: 1500}],
        total: 1500,
      },
    })
  })
})
