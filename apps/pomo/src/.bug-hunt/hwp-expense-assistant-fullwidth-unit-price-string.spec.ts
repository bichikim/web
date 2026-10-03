/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseAssistantResponse, parseExpenseText} from '../components/dev/hwp/expense'

it('should parse assistant JSON unitPrice strings with fullwidth digits like parseExpenseText', () => {
  const expected = parseExpenseText('2026-09-05\n두부 １,５００원')

  expect(
    parseExpenseAssistantResponse(
      '{"date":"2026-09-05","items":[{"name":"두부","quantity":1,"unitPrice":"１,５００"}]}',
    ),
  ).toEqual(expected)
})
