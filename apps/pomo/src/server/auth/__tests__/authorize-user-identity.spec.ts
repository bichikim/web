/** @vitest-environment node */
import {expect, expectTypeOf, it} from 'vitest'
import {authorizeUserIdentity} from '../authorize-user-identity'
import type {AuthAccess} from '../types'

const cookies = ['session=refreshed; HttpOnly', 'other=value; Secure']

it.each<AuthAccess>(['admin', 'anonymous', 'user'])(
  'should expose the existing user and cookies for %s access',
  (access) => {
    const result = authorizeUserIdentity({access, cookies, userId: 'user-1'})
    expect(result.authorized).toBe(true)
    if (!result.authorized) {
      throw new Error('Expected an authorized user')
    }
    expectTypeOf(result.userId).toEqualTypeOf<string>()
    expect(result.userId).toBe('user-1')
    expect(result.cookies).toBe(cookies)
  },
)

it.each<AuthAccess>(['admin', 'anonymous', 'user'])(
  'should reject a missing user for %s access with a private 401',
  async (access) => {
    const result = authorizeUserIdentity({access, cookies, userId: null})
    expect(result.authorized).toBe(false)
    if (result.authorized) {
      throw new Error('Expected a rejected user')
    }
    expect(result.response.status).toBe(401)
    expect(result.response.headers.getSetCookie()).toEqual(cookies)
    expect(result.response.headers.get('cache-control')).toBe('no-store')
    expect(result.response.headers.get('pragma')).toBe('no-cache')
    expect(result.response.headers.get('x-content-type-options')).toBe('nosniff')
    await expect(result.response.json()).resolves.toEqual({error: 'unauthorized'})
  },
)

it.each([null, 'user-1'])(
  'should prioritize invalid access over user presence (%s)',
  async (userId) => {
    const result = authorizeUserIdentity({access: 'invalid', cookies, userId})
    expect(result.authorized).toBe(false)
    if (result.authorized) {
      throw new Error('Expected a rejected user')
    }
    expect(result.response.status).toBe(503)
    expect(result.response.headers.getSetCookie()).toEqual(cookies)
    expect(result.response.headers.get('cache-control')).toBe('no-store')
    await expect(result.response.json()).resolves.toEqual({error: 'authentication_unavailable'})
  },
)

it('should preserve an empty user ID without adding a new validity policy', () => {
  expect(authorizeUserIdentity({access: 'user', cookies, userId: ''})).toEqual({
    authorized: true,
    cookies,
    userId: '',
  })
})
