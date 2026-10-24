/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {hasListItem} from '..'

describe('hasListItem', () => {
  it.each([
    ['member, admin', 'admin', true],
    ['admin, member', 'admin', true],
    ['not-admin', 'admin', false],
    [['member', 'admin'], 'admin', true],
    [['member'], 'admin', false],
    [null, 'admin', false],
    [undefined, 'admin', false],
    [1, 'admin', false],
    [{role: 'admin'}, 'admin', false],
    [['admin', 1], 'admin', false],
  ] as const)('should find %s in %j as %s', (values, expected, result) => {
    expect(hasListItem(values, expected)).toBe(result)
  })
})
