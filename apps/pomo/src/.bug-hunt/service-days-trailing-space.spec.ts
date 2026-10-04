/** @vitest-environment node */
import {expect, it} from 'vitest'
import {parseServiceDays} from '../features/tools/service-days'

it.each(['300 ', ' 300', '\t300\t', '300\n'])(
  'should parse service days when pasted with surrounding whitespace (%s)',
  (value) => {
    expect(parseServiceDays(value)).toBe(300)
  },
)
