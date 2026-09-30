import {expect, it} from 'vitest'

import {parseRetryAfterSeconds} from '../parse-retry-after-seconds'

it.each([
  [null, null],
  ['0', null],
  ['-1', null],
  ['1.5', null],
  ['Infinity', null],
  ['+2', null],
  ['1e2', null],
  ['0x10', null],
  ['0b10', null],
  ['9007199254740992', null],
  ['9007199254740993', null],
  ['999999999999999999999', null],
  ['Wed, 21 Oct 2015 07:28:00 GMT', null],
  ['1', 1],
  ['42', 42],
  ['9007199254740991', 9007199254740991],
  [' 2 ', 2],
] as const)('should parse the positive integer seconds from %s', (header, expected) => {
  expect(parseRetryAfterSeconds(header)).toBe(expected)
})
