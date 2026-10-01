/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseServiceDays} from 'src/features/tools/service-days'

it('should parse service days pasted with surrounding ASCII whitespace', () => {
  expect(parseServiceDays('300 ')).toBe(300)
  expect(parseServiceDays(' 300')).toBe(300)
  expect(parseServiceDays('300\n')).toBe(300)
  expect(parseServiceDays('\t365\t')).toBe(365)
})
