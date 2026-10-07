/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseAssistantResponse} from '../components/dev/hwp/expense'

it('should treat a zero-width-space-only assistant date like other blank dates', () => {
  const expected = parseExpenseAssistantResponse(
    JSON.stringify({
      items: [{name: '두부', quantity: 1, unitPrice: 1500}],
      questions: ['단가를 확인해 주세요.'],
    }),
  )

  expect(
    parseExpenseAssistantResponse(
      JSON.stringify({
        date: '\u200b',
        items: [{name: '두부', quantity: 1, unitPrice: 1500}],
        questions: ['단가를 확인해 주세요.'],
      }),
    ),
  ).toEqual(expected)
})
