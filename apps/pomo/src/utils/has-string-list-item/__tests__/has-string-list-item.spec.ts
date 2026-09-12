/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {hasStringListItem} from '..'

describe('hasStringListItem', () => {
  it.each([
    ['member, admin', 'admin', true],
    ['admin, member', 'admin', true],
    ['admin', 'admin', true],
    [',admin,', 'admin', true],
    ['not-admin', 'admin', false],
    ['ADMIN', 'admin', false],
    ['admin', ' admin', false],
    ['', 'admin', false],
  ] as const)('should find %s in %j as %s', (values, expected, result) => {
    expect(hasStringListItem(values, expected)).toBe(result)
  })
})
