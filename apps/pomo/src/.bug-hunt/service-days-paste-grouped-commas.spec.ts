/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseServiceDays} from '../features/tools/service-days'

it('should parse service days pasted with grouping separators like unit conversion does', () => {
  expect(parseServiceDays('1,000')).toBe(1000)
  expect(parseServiceDays('５，０００')).toBe(5000)
})
