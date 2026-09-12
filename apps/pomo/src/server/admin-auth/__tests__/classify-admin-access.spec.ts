/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {classifyAdminAccess} from '../classify-admin-access'

describe('classifyAdminAccess', () => {
  it.each([
    [null, 'anonymous'],
    [{session: null, user: null}, 'anonymous'],
    [{session: {}, user: {role: 'admin'}}, 'admin'],
    [{session: {}, user: {role: 'member'}}, 'forbidden'],
    [{session: {}, user: {role: ['admin', 1]}}, 'forbidden'],
    [undefined, 'invalid'],
    [{session: null, user: {}}, 'invalid'],
  ] as const)('should classify %# session data', (sessionData, expected) => {
    expect(classifyAdminAccess(sessionData)).toBe(expected)
  })
})
