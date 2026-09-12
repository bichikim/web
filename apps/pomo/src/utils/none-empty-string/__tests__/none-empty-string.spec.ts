/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {noneEmptyString} from '..'

describe('noneEmptyString', () => {
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
    expect(noneEmptyString(value)).toBe(result)
  })
})
