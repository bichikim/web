/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {classifyAuthAccess} from '../classify-auth-access'

describe('classifyAuthAccess', () => {
  it.each([
    [null, 'anonymous'],
    [{session: null, user: null}, 'anonymous'],
    [{session: {}, user: {role: 'admin'}}, 'admin'],
    [{session: {}, user: {role: 'member'}}, 'user'],
    [{session: {}, user: {role: ['admin', 1]}}, 'user'],
    [undefined, 'invalid'],
    [{session: null, user: {}}, 'invalid'],
  ] as const)('should classify %# session data', (sessionData, expected) => {
    expect(classifyAuthAccess(sessionData)).toBe(expected)
  })
})
