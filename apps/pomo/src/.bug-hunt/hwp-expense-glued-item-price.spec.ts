/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseText} from '../components/dev/hwp/expense'

it('should parse an expense line when the item name is glued to the unit price', () => {
  expect(parseExpenseText('당근2000원')).toEqual(parseExpenseText('당근 2000원'))
})
