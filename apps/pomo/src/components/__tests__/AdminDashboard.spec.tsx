/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {A, useNavigate} from '@solidjs/router'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {signOutAdminSession} from 'src/features/admin-auth/session'
import {AdminDashboard} from '../AdminDashboard'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn(), useNavigate: vi.fn()}))
vi.mock('src/features/admin-auth/session', () => ({signOutAdminSession: vi.fn()}))

const navigate = vi.fn()

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(A).mockImplementation((props) => <a href={props.href}>{props.children}</a>)
    vi.mocked(useNavigate).mockReturnValue(navigate)
  })

  it('should render the administration entry point', () => {
    render(() => <AdminDashboard />)

    expect(screen.getByRole('heading', {name: '콘텐츠 관리'})).toBeVisible()
    expect(screen.getByRole('link', {name: /음악 \/ 앨범 관리/})).toHaveAttribute(
      'href',
      '/admin/music',
    )
    expect(screen.getByRole('button', {name: '로그아웃'})).toBeEnabled()
  })

  it('should show progress and navigate after a successful sign-out', async () => {
    let resolveSignOut: ((wasSignedOut: boolean) => void) | undefined
    vi.mocked(signOutAdminSession).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSignOut = resolve
      }),
    )
    render(() => <AdminDashboard />)

    fireEvent.click(screen.getByRole('button', {name: '로그아웃'}))

    expect(screen.getByRole('button', {name: '로그아웃 중…'})).toBeDisabled()
    expect(signOutAdminSession).toHaveBeenCalledOnce()

    resolveSignOut?.(true)

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/admin/login', {replace: true})
    })
    expect(screen.getByRole('button', {name: '로그아웃'})).toBeEnabled()
  })

  it('should keep the dashboard open when sign-out is not confirmed', async () => {
    vi.mocked(signOutAdminSession).mockResolvedValueOnce(false)
    render(() => <AdminDashboard />)

    fireEvent.click(screen.getByRole('button', {name: '로그아웃'}))

    await waitFor(() => {
      expect(screen.getByRole('button', {name: '로그아웃'})).toBeEnabled()
    })
    expect(navigate).not.toHaveBeenCalled()
  })

  it('should allow retrying when session revocation throws', async () => {
    vi.mocked(signOutAdminSession).mockRejectedValueOnce(new Error('network unavailable'))
    render(() => <AdminDashboard />)

    fireEvent.click(screen.getByRole('button', {name: '로그아웃'}))

    await waitFor(() => {
      expect(screen.getByRole('button', {name: '로그아웃'})).toBeEnabled()
    })
    expect(navigate).not.toHaveBeenCalled()
  })
})
