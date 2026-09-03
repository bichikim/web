/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import type {AuthController} from '../../auth/controller'
import type {AuthenticationState} from '../../auth/machine'

const authMocks = vi.hoisted(() => ({useAuth: vi.fn()}))
const navigate = vi.fn()

vi.mock('@solidjs/router', () => ({
  action: vi.fn((clientAction) => clientAction),
  useAction: vi.fn((clientAction) => clientAction),
  useNavigate: vi.fn(() => navigate),
  useSubmission: vi.fn(() => ({pending: false})),
}))
vi.mock('../../auth/AuthProvider', () => ({useAuth: authMocks.useAuth}))

import {useTossAccount} from '../use-toss-account'

const [authenticationState, setAuthenticationState] = createSignal<AuthenticationState>({
  kind: 'anonymous',
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
  setAuthenticationState({kind: 'anonymous'})
  authMocks.useAuth.mockReturnValue(authentication)
})

it('should derive Toss authentication from the shared authentication context', () => {
  const {result} = renderHook(useTossAccount)

  expect(result.isAuthenticated()).toBe(false)

  setAuthenticationState({kind: 'authenticated', provider: 'toss'})
  expect(result.isAuthenticated()).toBe(true)
})

it('should expose the provider checking state as loading', () => {
  setAuthenticationState({kind: 'checking'})
  const {result} = renderHook(useTossAccount)

  expect(result.isLoading()).toBe(true)

  setAuthenticationState({kind: 'anonymous'})
  expect(result.isLoading()).toBe(false)
})

it('should explain when the shared authentication service becomes unavailable', () => {
  const {result} = renderHook(useTossAccount)

  expect(result.errorMessage()).toBeNull()

  setAuthenticationState({kind: 'unavailable'})
  expect(result.errorMessage()).toBe('로그인 상태를 확인하지 못했습니다.')
})
