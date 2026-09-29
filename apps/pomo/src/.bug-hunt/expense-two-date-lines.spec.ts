/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseExpenseText} from '../components/dev/hwp/expense'

it('should use the first date when two date lines appear', () => {
  expect(parseExpenseText('2026-09-05\n2026-09-06\n두부 1,500원')).toMatchObject({
    ok: true,
    value: {date: '2026-09-05'},
  })
})
