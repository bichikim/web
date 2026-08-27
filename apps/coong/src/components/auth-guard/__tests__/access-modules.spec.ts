import type {RouteMatch} from '@solidjs/router'
import {describe, expect, it} from 'vitest'

import {evaluateRouteAccess} from '../evaluate-route-access'
import {isAllowAll} from '../is-allow-all'
import {isAllow} from '../is-allow'

const createMatch = (publicValue?: boolean | 'only-unauthorized'): RouteMatch =>
  ({route: {info: {public: publicValue}}}) as unknown as RouteMatch

describe('isAllow', () => {
  it('should allow only unauthenticated users on an only-unauthorized route', () => {
    expect(isAllow(createMatch('only-unauthorized'), false)).toEqual({
      allow: true,
      reason: 'only-unauthorized',
    })
    expect(isAllow(createMatch('only-unauthorized'), true)).toEqual({
      allow: false,
      reason: 'only-unauthorized',
    })
  })

  it('should allow authenticated users and deny unauthenticated private access', () => {
    expect(isAllow(createMatch(), true)).toEqual({allow: true, reason: 'authorized'})
    expect(isAllow(createMatch(), false)).toEqual({allow: false, reason: 'public'})
    expect(isAllow(createMatch(true), false)).toEqual({allow: true, reason: 'public'})
  })
})

describe('isAllowAll', () => {
  it('should report the first denied match', () => {
    expect(isAllowAll([createMatch(true), createMatch('only-unauthorized')], true)).toEqual({
      allow: false,
      reason: 'only-unauthorized',
    })
  })

  it('should allow an empty match list', () => {
    expect(isAllowAll([], false)).toEqual({allow: true, reason: 'public'})
  })
})

describe('evaluateRouteAccess', () => {
  it('should defer access while authentication is loading', () => {
    expect(evaluateRouteAccess([createMatch()], 'loading')).toEqual({
      allow: false,
      pending: true,
      reason: 'public',
      session: 'loading',
    })
  })

  it('should evaluate resolved authentication state', () => {
    expect(evaluateRouteAccess([createMatch()], 'authenticated')).toEqual({
      allow: true,
      pending: false,
      reason: 'public',
      session: 'authenticated',
    })
  })
})
