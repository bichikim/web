/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

import type {AuthController} from '../../../features/auth/AuthProvider'
import type {AuthenticationState} from '../../../features/auth/machine'

const navigate = vi.fn()
const authMocks = vi.hoisted(() => ({useAuth: vi.fn()}))
const sessionMocks = vi.hoisted(() => ({
  clearStoredAppSession: vi.fn(),
  createTossLoginSession: vi.fn(),
  readStoredAppSession: vi.fn(),
  requestAccountLinkEmail: vi.fn(),
  revokeTossLoginSession: vi.fn(),
  validateAppSession: vi.fn(),
}))

vi.mock('@solidjs/router', () => ({
  action: vi.fn((clientAction) => clientAction),
  useAction: vi.fn(),
  useNavigate: vi.fn(),
  useSubmission: vi.fn(),
}))
vi.mock('../../../features/user-auth/app-session', () => sessionMocks)
vi.mock('../../../features/auth/AuthProvider', () => ({useAuth: authMocks.useAuth}))

import {useAction, useNavigate, useSubmission} from '@solidjs/router'

import {TossAccount} from '../TossAccount'

const [loginPending, setLoginPending] = createSignal(false)
const [logoutPending, setLogoutPending] = createSignal(false)
const [emailPending, setEmailPending] = createSignal(false)
const [authenticationState, setAuthenticationState] = createSignal<AuthenticationState>({
  kind: 'authenticated',
  provider: 'toss',
})
const authenticationSession = () => {
  const state = authenticationState()
  return state.kind === 'authenticated' ? state : null
}
const authentication: AuthController = {
  authenticatedEmail: () => null,
  session: authenticationSession,
  state: authenticationState,
}
const loginSubmission = {
  get pending() {
    return loginPending()
  },
}
const logoutSubmission = {
  get pending() {
    return logoutPending()
  },
}
const emailSubmission = {
  clear: vi.fn(),
  error: undefined,
  input: [],
  get pending() {
    return emailPending()
  },
  result: undefined,
  retry: vi.fn(),
  url: 'https://action/request-toss-account-link-email',
}

const wrapAction =
  (
    clientAction: (...input: ReadonlyArray<unknown>) => Promise<unknown>,
    setPending: (pending: boolean) => void,
  ) =>
  async (...input: ReadonlyArray<unknown>) => {
    setPending(true)
    try {
      return await clientAction(...input)
    } finally {
      setPending(false)
    }
  }

beforeEach(() => {
  vi.clearAllMocks()
  setLoginPending(false)
  setLogoutPending(false)
  setEmailPending(false)
  setAuthenticationState({kind: 'authenticated', provider: 'toss'})
  authMocks.useAuth.mockReturnValue(authentication)
  vi.mocked(useNavigate).mockReturnValue(navigate)
  vi.mocked(useAction)
    .mockImplementationOnce(
      (clientAction) =>
        wrapAction(async (...input) => {
          const result = await clientAction(...input)
          if ((result as {status?: string}).status === 'authenticated') {
            setAuthenticationState({kind: 'authenticated', provider: 'toss'})
          }
          return result
        }, setLoginPending) as ReturnType<typeof useAction>,
    )
    .mockImplementationOnce(
      (clientAction) =>
        wrapAction(async (...input) => {
          const result = await clientAction(...input)
          if ((result as {status?: string}).status !== 'unavailable') {
            setAuthenticationState({kind: 'anonymous'})
          }
          return result
        }, setLogoutPending) as ReturnType<typeof useAction>,
    )
    .mockImplementationOnce(
      (clientAction) => wrapAction(clientAction, setEmailPending) as ReturnType<typeof useAction>,
    )
  vi.mocked(useSubmission)
    .mockReturnValueOnce(loginSubmission as ReturnType<typeof useSubmission>)
    .mockReturnValueOnce(logoutSubmission as ReturnType<typeof useSubmission>)
    .mockReturnValueOnce(emailSubmission as ReturnType<typeof useSubmission>)
  sessionMocks.readStoredAppSession.mockResolvedValue('app-token')
  sessionMocks.validateAppSession.mockResolvedValue(true)
})

it('should return to Pomo after Toss login', async () => {
  setAuthenticationState({kind: 'anonymous'})
  sessionMocks.readStoredAppSession.mockResolvedValue(null)
  sessionMocks.createTossLoginSession.mockResolvedValue('app-token')

  render(() => <TossAccount />)

  const loginButton = await screen.findByRole('button', {name: '토스로 시작하기'})
  fireEvent.click(loginButton)

  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', {replace: true}))
})

it('should preserve later navigation when Toss login finishes after unmount', async () => {
  setAuthenticationState({kind: 'anonymous'})
  const loginSession = Promise.withResolvers<string>()
  sessionMocks.readStoredAppSession.mockResolvedValue(null)
  sessionMocks.createTossLoginSession.mockReturnValue(loginSession.promise)

  const result = render(() => <TossAccount />)
  fireEvent.click(await screen.findByRole('button', {name: '토스로 시작하기'}))
  await waitFor(() => expect(sessionMocks.createTossLoginSession).toHaveBeenCalledOnce())
  result.unmount()

  loginSession.resolve('app-token')
  await loginSession.promise
  await Promise.resolve()

  expect(navigate).not.toHaveBeenCalled()
})

it('should show the remaining delay when account link requests are rate limited', async () => {
  sessionMocks.requestAccountLinkEmail.mockResolvedValue({
    retryAfterSeconds: 42,
    status: 'rate-limited',
  })

  render(() => <TossAccount />)

  await waitFor(() => expect(screen.queryByLabelText('연결할 이메일')).not.toBeNull())
  fireEvent.input(screen.getByLabelText('연결할 이메일'), {
    target: {value: 'user@example.com'},
  })
  fireEvent.submit(screen.getByRole('button', {name: '웹 로그인 연결하기'}).closest('form')!)

  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('42초 후'))
})

it('should show login progress and explain a failed Toss login', async () => {
  setAuthenticationState({kind: 'anonymous'})
  const loginSession = Promise.withResolvers<string>()
  sessionMocks.readStoredAppSession.mockResolvedValue(null)
  sessionMocks.createTossLoginSession.mockReturnValue(loginSession.promise)

  render(() => <TossAccount />)

  fireEvent.click(await screen.findByRole('button', {name: '토스로 시작하기'}))
  expect(screen.getByRole('button', {name: '토스 확인 중…'})).toBeDisabled()

  loginSession.reject(new Error('login unavailable'))

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('토스 로그인을 완료하지 못했습니다.')
  })
})

it('should sign out the active Toss session and show confirmation', async () => {
  sessionMocks.revokeTossLoginSession.mockResolvedValueOnce({storageStatus: 'cleared'})

  render(() => <TossAccount />)

  const logoutButton = await screen.findByRole('button', {name: '로그아웃'})
  fireEvent.click(logoutButton)

  await waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent('로그아웃했습니다.')
  })
  expect(sessionMocks.revokeTossLoginSession).toHaveBeenCalledWith('app-token')
  expect(screen.getByRole('button', {name: '토스로 시작하기'})).toBeEnabled()
})

it.each(['cleared', 'cleanup-pending'] as const)(
  'should ignore stale active-account handlers after sign-out with %s storage',
  async (storageStatus) => {
    let submitHandler: unknown = null
    const listenerSpy = vi
      .spyOn(HTMLFormElement.prototype, 'addEventListener')
      .mockImplementation((type, listener) => {
        if (type === 'submit' && typeof listener === 'function') {
          submitHandler = listener
        }
      })
    sessionMocks.revokeTossLoginSession.mockResolvedValueOnce({storageStatus})

    render(() => <TossAccount />)

    const logoutButton = await screen.findByRole('button', {name: '로그아웃'})
    await screen.findByRole('button', {name: '웹 로그인 연결하기'})
    listenerSpy.mockRestore()

    fireEvent.click(logoutButton)
    await screen.findByRole('button', {name: '토스로 시작하기'})

    const logoutHandler = Reflect.get(logoutButton, '$$click')
    expect(logoutHandler).toEqual(expect.any(Function))
    expect(submitHandler).toEqual(expect.any(Function))

    if (typeof logoutHandler === 'function') {
      logoutHandler(new MouseEvent('click'))
    }
    if (typeof submitHandler === 'function') {
      submitHandler(new Event('submit', {cancelable: true}))
    }

    expect(sessionMocks.revokeTossLoginSession).toHaveBeenCalledOnce()
    expect(sessionMocks.requestAccountLinkEmail).not.toHaveBeenCalled()
  },
)

it('should sign out locally when revoked session storage cleanup is pending', async () => {
  sessionMocks.revokeTossLoginSession.mockResolvedValueOnce({storageStatus: 'cleanup-pending'})

  render(() => <TossAccount />)

  fireEvent.click(await screen.findByRole('button', {name: '로그아웃'}))

  await screen.findByRole('button', {name: '토스로 시작하기'})
  expect(screen.getByRole('alert')).toHaveTextContent(
    '로그아웃했지만 기기 저장 정보를 정리하지 못했습니다.',
  )
  expect(screen.queryByText('토스 계정으로 사용 중')).toBeNull()
  expect(screen.queryByLabelText('연결할 이메일')).toBeNull()
  expect(sessionMocks.requestAccountLinkEmail).not.toHaveBeenCalled()
})

it('should allow retrying when active Toss session logout fails', async () => {
  sessionMocks.revokeTossLoginSession.mockRejectedValueOnce(new Error('revoke unavailable'))

  render(() => <TossAccount />)

  fireEvent.click(await screen.findByRole('button', {name: '로그아웃'}))

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('로그아웃하지 못했습니다.')
  })
  expect(screen.getByRole('button', {name: '로그아웃'})).toBeEnabled()
})

it('should show email-link progress and confirm a sent link', async () => {
  const emailRequest = Promise.withResolvers<{readonly status: 'sent'}>()
  sessionMocks.requestAccountLinkEmail.mockReturnValueOnce(emailRequest.promise)

  render(() => <TossAccount />)

  const emailField = await screen.findByLabelText('연결할 이메일')
  const emailForm = screen.getByRole('button', {name: '웹 로그인 연결하기'}).closest('form')
  expect(emailForm).toHaveAttribute('action', '/api/account/link-email')
  expect(emailForm).toHaveAttribute('method', 'post')
  expect(emailField).toHaveAttribute('name', 'email')
  fireEvent.input(emailField, {target: {value: 'user@example.com'}})
  fireEvent.submit(emailForm!)
  expect(screen.getByRole('button', {name: '이메일 전송 중…'})).toBeDisabled()

  emailRequest.resolve({status: 'sent'})

  await waitFor(() => {
    expect(screen.getByRole('status')).toHaveTextContent(
      '웹 로그인 연결 링크를 이메일로 보냈습니다.',
    )
  })
  expect(sessionMocks.requestAccountLinkEmail).toHaveBeenCalledWith('app-token', 'user@example.com')
})

it('should explain rejected, indefinitely limited, and failed email-link requests', async () => {
  sessionMocks.requestAccountLinkEmail
    .mockResolvedValueOnce({status: 'not-sent'})
    .mockResolvedValueOnce({retryAfterSeconds: null, status: 'rate-limited'})
    .mockRejectedValueOnce(new Error('server unavailable'))
    .mockResolvedValueOnce({status: 'unexpected'})

  render(() => <TossAccount />)

  const emailField = await screen.findByLabelText('연결할 이메일')
  fireEvent.input(emailField, {target: {value: 'user@example.com'}})
  const form = screen.getByRole('button', {name: '웹 로그인 연결하기'}).closest('form')!

  fireEvent.submit(form)
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('연결 이메일을 보내지 못했습니다.')
  })

  fireEvent.submit(form)
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('잠시 후 다시 시도해 주세요.')
  })

  fireEvent.submit(form)
  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('계정 연결 서버에 접속하지 못했습니다.')
  })

  fireEvent.submit(form)
  await waitFor(() => {
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
