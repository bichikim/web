/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseServiceDays} from '../features/tools/service-days'

it('should parse service days pasted with fullwidth digits', () => {
  expect(parseServiceDays('３６５')).toBe(365)
})
