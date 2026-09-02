/** @vitest-environment jsdom */

import {A, useAction, useNavigate, useSubmission} from '@solidjs/router'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({
  A: vi.fn(),
  action: vi.fn(),
  useAction: vi.fn(),
  useNavigate: vi.fn(),
  useSubmission: vi.fn(),
}))

import {AdminDashboard} from '../AdminDashboard'

const [pending, setPending] = createSignal(false)
const [result, setResult] = createSignal<{readonly status: string} | undefined>()
const submission = {
  clear: vi.fn(),
  error: undefined,
  input: [],
  get pending() {
    return pending()
  },
  get result() {
    return result()
  },
  retry: vi.fn(),
  url: 'https://action/sign-out-admin-session',
}
const navigate = vi.fn()
const signOut = vi.fn()

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.history.replaceState(null, '', '/admin')
    setPending(false)
    setResult(undefined)
    signOut.mockReset()
    vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
    vi.mocked(useAction).mockReturnValue(signOut)
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useSubmission).mockReturnValue(submission as ReturnType<typeof useSubmission>)
  })

  it('should render the administration entry point and a post sign-out form', () => {
    render(() => <AdminDashboard />)

    expect(screen.getByRole('heading', {name: '콘텐츠 관리'})).toBeVisible()
    expect(screen.getByRole('link', {name: /음악 \/ 앨범 관리/})).toHaveAttribute(
      'href',
      '/admin/music',
    )
    const form = screen.getByRole('button', {name: '로그아웃'}).closest('form')

    expect(form).toHaveAttribute('method', 'post')
    expect(form).toHaveAttribute('action', '/api/auth/sign-out')

    fireEvent.submit(form!)
    expect(signOut).toHaveBeenCalledOnce()
    expect(signOut.mock.calls[0]?.[0]).toBeInstanceOf(FormData)
  })

  it('should derive sign-out progress from the action submission', () => {
    render(() => <AdminDashboard />)

    setPending(true)

    expect(screen.getByRole('button', {name: '로그아웃 중…'})).toBeDisabled()
  })

  it('should explain a rejected client sign-out action', async () => {
    render(() => <AdminDashboard />)
    setResult({status: 'rejected'})

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    )
  })

  it('should navigate after a successful client sign-out action', () => {
    render(() => <AdminDashboard />)
    setResult({status: 'signed-out'})

    expect(navigate).toHaveBeenCalledWith('/admin/login', {replace: true})
  })
})
