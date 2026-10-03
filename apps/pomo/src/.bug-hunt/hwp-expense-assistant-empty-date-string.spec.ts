/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseAssistantResponse} from '../components/dev/hwp/expense'

it('should treat an empty assistant date string like a missing date', () => {
  const withoutDateKey = parseExpenseAssistantResponse(
    '{"items":[{"name":"두부","quantity":1,"unitPrice":1500}],"questions":[]}',
  )

  expect(
    parseExpenseAssistantResponse(
      '{"date":"","items":[{"name":"두부","quantity":1,"unitPrice":1500}],"questions":[]}',
    ),
  ).toEqual(withoutDateKey)
})
