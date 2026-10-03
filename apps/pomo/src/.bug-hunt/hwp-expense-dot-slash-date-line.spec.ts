/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseAssistantResponse, parseExpenseText} from '../components/dev/hwp/expense'

it('should parse dotted and slash-separated expense date lines like dashed ones', () => {
  const expected = parseExpenseText('2026-09-05\n두부 1,500원')

  expect(parseExpenseText('2026.09.05\n두부 1,500원')).toEqual(expected)
  expect(parseExpenseText('2026/09/05\n두부 1,500원')).toEqual(expected)
})

it('should parse dotted dates in assistant JSON like dashed dates', () => {
  const expected = parseExpenseAssistantResponse(
    '{"date":"2026-09-05","items":[{"name":"두부","quantity":1,"unitPrice":1500}],"questions":[]}',
  )

  expect(
    parseExpenseAssistantResponse(
      '{"date":"2026.09.05","items":[{"name":"두부","quantity":1,"unitPrice":1500}],"questions":[]}',
    ),
  ).toEqual(expected)
})
