/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseAssistantResponse, parseExpenseText} from '../components/dev/hwp/expense'

it('should parse assistant JSON date strings with fullwidth digits like parseExpenseText', () => {
  const expected = parseExpenseText('２０２６-０９-０５\n두부 1,500원')

  expect(
    parseExpenseAssistantResponse(
      '{"date":"２０２６-０９-０５","items":[{"name":"두부","quantity":1,"unitPrice":1500}],"questions":[]}',
    ),
  ).toEqual(expected)
})
