/** @vitest-environment jsdom */

import {MemoryRouter} from '@solidjs/router'
import {render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({
  accountSessionQuery: vi.fn(),
  tossSessionQuery: vi.fn(),
}))

vi.mock('../../user-auth/session-query', () => ({
  accountSessionQuery: sessionMocks.accountSessionQuery,
  tossSessionQuery: sessionMocks.tossSessionQuery,
}))

import {AuthProvider, useAuth} from '../AuthProvider'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should reject consumers outside the authentication provider', () => {
  expect(() => render(() => <AuthConsumer />)).toThrow('useAuth must be used inside AuthProvider.')
})

it('should share one authenticated web session with every consumer', async () => {
  sessionMocks.accountSessionQuery.mockResolvedValue({email: 'user@example.com'})
  const observedContexts: Array<ReturnType<typeof useAuth>> = []
  const FirstConsumer = () => {
    observedContexts.push(useAuth())
    return null
  }
  const SecondConsumer = () => {
    observedContexts.push(useAuth())
    return null
  }

  render(() => (
    <MemoryRouter
      root={(props) => (
        <AuthProvider>
          <FirstConsumer />
          <SecondConsumer />
          {props.children}
        </AuthProvider>
      )}
    />
  ))

  expect(observedContexts).toHaveLength(2)
  expect(observedContexts[0]).toBe(observedContexts[1])
  expect(observedContexts[0]?.state()).toEqual({kind: 'checking'})
  await waitFor(() =>
    expect(observedContexts[0]?.state()).toEqual({
      email: 'user@example.com',
      kind: 'authenticated',
      provider: 'email',
    }),
  )
  expect(observedContexts[0]?.authenticatedEmail()).toBe('user@example.com')
  expect(sessionMocks.accountSessionQuery).toHaveBeenCalledOnce()
  expect(sessionMocks.tossSessionQuery).not.toHaveBeenCalled()
})

it('should expose an authenticated Toss session without exposing its token', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  sessionMocks.tossSessionQuery.mockResolvedValue(true)
  let authentication: ReturnType<typeof useAuth> | undefined
  const Consumer = () => {
    authentication = useAuth()
    return null
  }

  render(() => (
    <MemoryRouter
      root={(props) => (
        <AuthProvider>
          <Consumer />
          {props.children}
        </AuthProvider>
      )}
    />
  ))

  await waitFor(() =>
    expect(authentication?.state()).toEqual({kind: 'authenticated', provider: 'toss'}),
  )
  expect(authentication?.authenticatedEmail()).toBeNull()
  expect(sessionMocks.tossSessionQuery).toHaveBeenCalledOnce()
  expect(sessionMocks.accountSessionQuery).not.toHaveBeenCalled()
})

it('should distinguish an unavailable session service from an anonymous session', async () => {
  sessionMocks.accountSessionQuery.mockRejectedValue(new Error('unavailable'))
  let authentication: ReturnType<typeof useAuth> | undefined
  const Consumer = () => {
    authentication = useAuth()
    return null
  }

  render(() => (
    <MemoryRouter
      root={(props) => (
        <AuthProvider>
          <Consumer />
          {props.children}
        </AuthProvider>
      )}
    />
  ))

  await waitFor(() => expect(authentication?.state()).toEqual({kind: 'unavailable'}))
})

const AuthConsumer = () => {
  useAuth()
  return null
}
