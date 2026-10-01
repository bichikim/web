/** @vitest-environment node */
import {expect, it} from 'vitest'

import {convertUnit} from '../features/tools/units'

it.each([
  ['en dash (U+2013)', '–5'],
  ['figure dash (U+2012)', '‒5'],
  ['small form hyphen-minus (U+FE63)', '﹣5'],
])('should convert values pasted with a %s', (_label, value) => {
  expect(convertUnit({from: 'm', to: 'm', value})).toEqual({kind: 'valid', value: -5})
})
