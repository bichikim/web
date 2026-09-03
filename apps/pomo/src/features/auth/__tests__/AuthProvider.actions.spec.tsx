/** @vitest-environment jsdom */

import {MemoryRouter, query, useAction} from '@solidjs/router'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({
  clearStoredAppSession: vi.fn(),
  completeAccountLink: vi.fn(),
  createTossLoginSession: vi.fn(),
  readAccountSession: vi.fn(),
  readStoredAppSession: vi.fn(),
  requestAccountLinkEmail: vi.fn(),
  revokeTossLoginSession: vi.fn(),
  signOutWebSession: vi.fn(),
  validateAppSession: vi.fn(),
}))

vi.mock('../../user-auth/app-session', () => ({
  clearStoredAppSession: sessionMocks.clearStoredAppSession,
  createTossLoginSession: sessionMocks.createTossLoginSession,
  readStoredAppSession: sessionMocks.readStoredAppSession,
  requestAccountLinkEmail: sessionMocks.requestAccountLinkEmail,
  revokeTossLoginSession: sessionMocks.revokeTossLoginSession,
  validateAppSession: sessionMocks.validateAppSession,
}))
vi.mock('../../user-auth/web-session', () => ({
  completeAccountLink: sessionMocks.completeAccountLink,
  readAccountSession: sessionMocks.readAccountSession,
  signOutWebSession: sessionMocks.signOutWebSession,
}))

import {createTossLoginSessionAction, revokeTossLoginSessionAction} from '../../user-auth/actions'
import {signOutAccountSessionAction} from '../actions'
import {AuthProvider, useAuth} from '../AuthProvider'

let webSession: {readonly email: string} | null = null
let tossToken: string | null = null

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
  webSession = null
  tossToken = null
  sessionMocks.readAccountSession.mockImplementation(() => Promise.resolve(webSession))
  sessionMocks.readStoredAppSession.mockImplementation(() => Promise.resolve(tossToken))
  sessionMocks.validateAppSession.mockResolvedValue(true)
  sessionMocks.createTossLoginSession.mockImplementation(() => {
    tossToken = 'app-token'
    return Promise.resolve('app-token')
  })
  sessionMocks.revokeTossLoginSession.mockImplementation(() => {
    tossToken = null
    return Promise.resolve({storageStatus: 'cleared'})
  })
  sessionMocks.signOutWebSession.mockImplementation(() => {
    webSession = null
    return Promise.resolve(true)
  })
})

afterEach(() => {
  query.clear()
  vi.unstubAllEnvs()
})

it('should synchronize every consumer after a web sign-out action', async () => {
  webSession = {email: 'user@example.com'}

  render(() => <MemoryRouter root={WebAuthenticationRoot} />)

  await waitFor(() => {
    expect(screen.getByTestId('first-authentication')).toHaveTextContent('user@example.com')
  })
  expect(screen.getByTestId('second-authentication')).toHaveTextContent('user@example.com')
  fireEvent.click(screen.getByRole('button', {name: '웹 로그아웃'}))

  await waitFor(() => {
    expect(screen.getByTestId('first-authentication')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('second-authentication')).toHaveTextContent('anonymous')
  })
})

it('should synchronize Toss login and logout actions through the shared session query', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')

  render(() => <MemoryRouter root={TossAuthenticationRoot} />)

  await waitFor(() => {
    expect(screen.getByTestId('first-authentication')).toHaveTextContent('anonymous')
  })
  fireEvent.click(screen.getByRole('button', {name: '토스 로그인'}))
  await waitFor(() => {
    expect(screen.getByTestId('first-authentication')).toHaveTextContent('toss')
    expect(screen.getByTestId('second-authentication')).toHaveTextContent('toss')
  })

  fireEvent.click(screen.getByRole('button', {name: '토스 로그아웃'}))
  await waitFor(() => {
    expect(screen.getByTestId('first-authentication')).toHaveTextContent('anonymous')
    expect(screen.getByTestId('second-authentication')).toHaveTextContent('anonymous')
  })
})

const AuthenticationStatus = (props: {readonly name: string}) => {
  const authentication = useAuth()
  const label = () => {
    const session = authentication.session()

    if (session === null) {
      return authentication.state().kind
    }

    return session.provider === 'email' ? session.email : session.provider
  }

  return <p data-testid={props.name}>{label()}</p>
}

const WebAuthenticationRoot = () => {
  const signOut = useAction(signOutAccountSessionAction)

  return (
    <AuthProvider>
      <AuthenticationStatus name="first-authentication" />
      <AuthenticationStatus name="second-authentication" />
      <button onClick={() => signOut(new FormData())}>웹 로그아웃</button>
    </AuthProvider>
  )
}

const TossAuthenticationRoot = () => {
  const login = useAction(createTossLoginSessionAction)
  const logout = useAction(revokeTossLoginSessionAction)

  return (
    <AuthProvider>
      <AuthenticationStatus name="first-authentication" />
      <AuthenticationStatus name="second-authentication" />
      <button onClick={() => login()}>토스 로그인</button>
      <button onClick={() => logout()}>토스 로그아웃</button>
    </AuthProvider>
  )
}
