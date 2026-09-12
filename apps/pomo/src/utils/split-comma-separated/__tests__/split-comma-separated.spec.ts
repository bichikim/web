/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {splitCommaSeparated} from '..'

describe('splitCommaSeparated', () => {
  it.each([
    ['admin,member', ['admin', 'member']],
    ['admin', ['admin']],
    ['member, admin', ['member', ' admin']],
    [',admin,', ['', 'admin', '']],
    ['', ['']],
    ['a,,b', ['a', '', 'b']],
  ] as const)('should split %j into %j', (values, result) => {
    expect(splitCommaSeparated(values)).toEqual([...result])
  })
})
