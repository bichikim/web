import {describe, expect, it} from 'vitest'

import {classifyAdminAccess, hasAdminRole} from '../access'

describe('hasAdminRole', () => {
  it.each([
    ['admin', true],
    ['member, admin', true],
    ['member', false],
    [['member', 'admin'], true],
    [['member'], false],
    [null, false],
  ] as const)('should classify %# role input', (role, expected) => {
    expect(hasAdminRole(role)).toBe(expected)
  })
})

describe('classifyAdminAccess', () => {
  it.each([
    [null, 'anonymous'],
    [{session: null, user: null}, 'anonymous'],
    [{session: {}, user: {role: 'admin'}}, 'admin'],
    [{session: {}, user: {role: 'member'}}, 'forbidden'],
    [undefined, 'invalid'],
    [{session: null, user: {}}, 'invalid'],
  ] as const)('should classify %# session data', (sessionData, expected) => {
    expect(classifyAdminAccess(sessionData)).toBe(expected)
  })
})
