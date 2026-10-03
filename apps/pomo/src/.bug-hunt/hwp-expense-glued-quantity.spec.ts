/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseText} from '../components/dev/hwp/expense'

it('should parse an expense line when quantity is glued after 원', () => {
  expect(parseExpenseText('고구마 1000원2개')).toEqual(parseExpenseText('고구마 1000원 2개'))
})
