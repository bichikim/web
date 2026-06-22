import {describe, expect, it} from 'vitest'
import type {RouteMatch} from '@solidjs/router'
import {evaluateRouteAccess, isAllowAll, resolveAuthRedirectUrl, resolveAuthSession} from '../allow'

const createMatch = (publicValue: boolean | 'only-unauthorized'): RouteMatch =>
  ({
    params: {},
    path: '/',
    route: {
      info: {
        public: publicValue,
      },
    },
  }) as unknown as RouteMatch

describe('resolveAuthSession', () => {
  it('should return loading when user is undefined', () => {
    expect(resolveAuthSession(undefined)).toBe('loading')
  })

  it('should return unauthenticated when user is null', () => {
    expect(resolveAuthSession(null)).toBe('unauthenticated')
  })

  it('should return authenticated when user exists', () => {
    expect(resolveAuthSession({id: 'user-1'})).toBe('authenticated')
  })
})

describe('evaluateRouteAccess', () => {
  it('should defer route decisions while the session is loading', () => {
    expect(evaluateRouteAccess([createMatch(false)], 'loading')).toEqual({
      allow: false,
      pending: true,
      reason: 'public',
      session: 'loading',
    })
  })

  it('should evaluate access after the session is resolved', () => {
    expect(evaluateRouteAccess([createMatch(false)], 'unauthenticated')).toEqual({
      allow: false,
      pending: false,
      reason: 'public',
      session: 'unauthenticated',
    })
  })
})

describe('resolveAuthRedirectUrl', () => {
  const urls = {homeUrl: '/', signInUrl: '/auth/sign-in'}

  it('should not redirect while the session is loading', () => {
    expect(resolveAuthRedirectUrl({allow: false, pending: true, reason: 'public'}, urls)).toBeNull()
  })

  it('should redirect unauthenticated users from private routes to sign-in', () => {
    expect(resolveAuthRedirectUrl({allow: false, pending: false, reason: 'public'}, urls)).toBe(
      '/auth/sign-in',
    )
  })

  it('should redirect authenticated users from only-unauthorized routes to home', () => {
    expect(
      resolveAuthRedirectUrl({allow: false, pending: false, reason: 'only-unauthorized'}, urls),
    ).toBe('/')
  })
})

describe('isAllowAll', () => {
  it('should deny only-unauthorized routes for authenticated users', () => {
    expect(isAllowAll([createMatch('only-unauthorized')], true)).toEqual({
      allow: false,
      reason: 'only-unauthorized',
    })
  })

  it('should allow only-unauthorized routes for unauthenticated users', () => {
    expect(isAllowAll([createMatch('only-unauthorized')], false)).toEqual({
      allow: true,
      reason: 'public',
    })
  })

  it('should deny private routes for unauthenticated users', () => {
    expect(isAllowAll([createMatch(false)], false)).toEqual({
      allow: false,
      reason: 'public',
    })
  })

  it('should allow private routes for authenticated users', () => {
    expect(isAllowAll([createMatch(false)], true)).toEqual({
      allow: true,
      reason: 'public',
    })
  })

  it('should allow public routes for unauthenticated users', () => {
    expect(isAllowAll([createMatch(true)], false)).toEqual({
      allow: true,
      reason: 'public',
    })
  })

  it('should return the first disallowed route reason', () => {
    expect(isAllowAll([createMatch(true), createMatch(false)], false)).toEqual({
      allow: false,
      reason: 'public',
    })
  })
})
