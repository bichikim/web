/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {isNonBlankString} from '..'

describe('isNonBlankString', () => {
  it.each([
    ['hello', true],
    [' hello ', true],
    ['0', true],
    ['', false],
    ['   ', false],
    ['\t', false],
    ['\n', false],
    [' \t\n ', false],
  ] as const)('should treat %j as %s', (value, result) => {
    expect(isNonBlankString(value)).toBe(result)
  })
})
