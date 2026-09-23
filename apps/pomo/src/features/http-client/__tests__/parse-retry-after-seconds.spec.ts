import {expect, it} from 'vitest'

import {parseRetryAfterSeconds} from '../parse-retry-after-seconds'

it.each([
  [null, null],
  ['0', null],
  ['-1', null],
  ['1.5', null],
  ['Infinity', null],
  ['Wed, 21 Oct 2015 07:28:00 GMT', null],
  ['1', 1],
  ['42', 42],
  [' 2 ', 2],
] as const)('should parse the positive integer seconds from %s', (header, expected) => {
  expect(parseRetryAfterSeconds(header)).toBe(expected)
})
