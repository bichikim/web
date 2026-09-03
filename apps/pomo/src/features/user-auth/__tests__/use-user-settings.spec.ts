/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import type {AuthController} from '../../auth/controller'
import type {AuthenticationState} from '../../auth/machine'

const authMocks = vi.hoisted(() => ({useAuth: vi.fn()}))

vi.mock('../../auth/AuthProvider', () => ({useAuth: authMocks.useAuth}))

import {useUserSettings} from '../use-user-settings'

const [authenticationState, setAuthenticationState] = createSignal<AuthenticationState>({
  kind: 'checking',
})
const authenticationSession = () => {
  const state = authenticationState()
  return state.kind === 'authenticated' ? state : null
}
const authentication: AuthController = {
  session: authenticationSession,
  state: authenticationState,
}

beforeEach(() => {
  vi.clearAllMocks()
  setAuthenticationState({kind: 'checking'})
  authMocks.useAuth.mockReturnValue(authentication)
})

it('should map checking and anonymous authentication states', () => {
  const {result} = renderHook(useUserSettings)

  expect(result.state()).toEqual({kind: 'loading'})
  expect(result.authenticatedUser()).toBeNull()
  expect(result.authenticatedEmail()).toBeNull()

  setAuthenticationState({kind: 'anonymous'})
  expect(result.state()).toEqual({kind: 'anonymous'})
})

it('should expose an authenticated email account', () => {
  setAuthenticationState({
    email: 'user@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  const {result} = renderHook(useUserSettings)

  expect(result.authenticatedUser()).toEqual({
    email: 'user@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  expect(result.authenticatedEmail()).toBe('user@example.com')
})

it('should expose an authenticated Toss account without an email', () => {
  setAuthenticationState({kind: 'authenticated', provider: 'toss'})
  const {result} = renderHook(useUserSettings)

  expect(result.authenticatedUser()).toEqual({kind: 'authenticated', provider: 'toss'})
  expect(result.authenticatedEmail()).toBeNull()
})

it('should map an unavailable authentication service to an error', () => {
  setAuthenticationState({kind: 'unavailable'})
  const {result} = renderHook(useUserSettings)

  expect(result.state()).toEqual({kind: 'error'})
})
