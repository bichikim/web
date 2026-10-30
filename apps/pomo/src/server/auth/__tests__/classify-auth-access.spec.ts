/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {classifyAuthAccess} from '../classify-auth-access'

describe('classifyAuthAccess', () => {
  it.each([
    [null, 'anonymous'],
    [{session: null, user: null}, 'anonymous'],
    [undefined, 'invalid'],
    [{session: null, user: {}}, 'invalid'],
  ] as const)('should classify %# session data', (sessionData, expected) => {
    expect(classifyAuthAccess(sessionData)).toBe(expected)
  })

  it.each([
    ['admin', 'admin'],
    ['member, admin', 'admin'],
    ['admin, member', 'admin'],
    [',admin,', 'admin'],
    ['  admin  ', 'admin'],
    ['member', 'user'],
    ['not-admin', 'user'],
    ['ADMIN', 'user'],
    ['', 'user'],
    [['member', 'admin'], 'admin'],
    [['member'], 'user'],
    [['admin', 1], 'user'],
    [[' admin '], 'user'],
    [[], 'user'],
    [null, 'user'],
    [undefined, 'user'],
    [1, 'user'],
    [{role: 'admin'}, 'user'],
  ] as const)('should classify role case %#', (role, expected) => {
    expect(classifyAuthAccess({session: {}, user: {role}})).toBe(expected)
  })
})
