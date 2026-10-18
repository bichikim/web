/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {parseCommaSeparated} from '..'

describe('parseCommaSeparated', () => {
  it.each([
    ['admin,member', ['admin', 'member']],
    [' member,\tadmin\n , member ', ['member', 'admin', 'member']],
    ['', []],
    ['\t \n', []],
    [',,,', []],
    [',admin,,member,', ['admin', 'member']],
    ['item,,item, ITEM', ['item', 'item', 'ITEM']],
    ['\u00a0admin\ufeff,\u3000member', ['admin', 'member']],
    ['a;b，c', ['a;b，c']],
  ] as const)('should parse %j as %j', (values, expected) => {
    expect(parseCommaSeparated(values)).toEqual([...expected])
  })
})
