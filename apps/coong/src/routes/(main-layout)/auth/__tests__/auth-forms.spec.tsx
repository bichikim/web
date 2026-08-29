/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {JSX} from 'solid-js'
import {ChangePassword} from '../change-password/_components/ChangePassword'
import {DeleteAccount} from '../delete-account/_components/DeleteAccount'
import {SignIn} from '../sign-in/_components/SignIn'
import {SignUp} from '../sign-up/_components/SignUp'
import {useAction, useNavigate, useSubmission} from '@solidjs/router'
import {useAuth} from 'src/store/auth'

vi.mock('@solidjs/router', () => ({
  A: (props: {children: JSX.Element; href: string}) => <a href={props.href}>{props.children}</a>,
  useAction: vi.fn(),
  useNavigate: vi.fn(),
  useSubmission: vi.fn(),
}))

vi.mock('src/store/auth', () => ({useAuth: vi.fn()}))
vi.mock('src/requests/auth/sign-up', () => ({signUpAction: vi.fn()}))

const changePassword = vi.fn()
const deleteAccount = vi.fn()
const navigate = vi.fn()
const signUp = vi.fn()

describe('auth forms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useAction).mockReturnValue(signUp)
    vi.mocked(useSubmission).mockReturnValue({error: undefined, pending: false} as never)
    vi.mocked(useAuth).mockReturnValue({changePassword, deleteAccount, user: () => null} as never)
  })

  it('should submit sign-in values through the provided callbacks', async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined)
    const onUpdateEmail = vi.fn()
    const onUpdatePassword = vi.fn()

    render(() => (
      <SignIn
        email="user@example.com"
        error={new Error('Previous failure')}
        loading={false}
        password="secret"
        onLogin={onLogin}
        onUpdateEmail={onUpdateEmail}
        onUpdatePassword={onUpdatePassword}
      />
    ))

    fireEvent.input(screen.getByLabelText('Email'), {target: {value: 'next@example.com'}})
    fireEvent.input(screen.getByLabelText('Password'), {target: {value: 'next-secret'}})
    fireEvent.submit(screen.getByRole('button', {name: 'Sign In'}))

    await waitFor(() => expect(onLogin).toHaveBeenCalledOnce())
    expect(onUpdateEmail).toHaveBeenCalledWith('next@example.com')
    expect(onUpdatePassword).toHaveBeenCalledWith('next-secret')
    expect(screen.getByText('Previous failure')).toBeInTheDocument()
  })

  it('should reject mismatched passwords and toggle password visibility', async () => {
    render(() => <ChangePassword />)

    const fields = screen.getAllByLabelText(/패스워드/)
    fireEvent.input(fields[0], {target: {value: 'secret-one'}})
    fireEvent.input(fields[1], {target: {value: 'secret-two'}})
    fireEvent.click(screen.getAllByRole('button', {name: '패스워드 표시하기'})[0])
    fireEvent.submit(screen.getByRole('button', {name: '패스워드 변경'}))

    expect(fields[0]).toHaveAttribute('type', 'text')
    expect(await screen.findByText('패스워드가 일치하지 않습니다.')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('should change a matching password and navigate home', async () => {
    changePassword.mockResolvedValueOnce(undefined)
    render(() => <ChangePassword />)

    const fields = screen.getAllByLabelText(/패스워드/)
    fireEvent.input(fields[0], {target: {value: 'new-secret'}})
    fireEvent.input(fields[1], {target: {value: 'new-secret'}})
    fireEvent.submit(screen.getByRole('button', {name: '패스워드 변경'}))

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('new-secret'))
    expect(navigate).toHaveBeenCalledWith('/')
  })

  it('should only delete the account after the confirmation phrase', async () => {
    deleteAccount.mockResolvedValueOnce(undefined)
    vi.mocked(useAuth).mockReturnValue({
      changePassword,
      deleteAccount,
      user: () => ({email: 'member@example.com'}),
    } as never)
    render(() => <DeleteAccount />)

    expect(screen.getByRole('button', {name: '회원 탈퇴'})).toBeDisabled()
    fireEvent.input(screen.getByLabelText(/계속하시려면/), {target: {value: '회원 탈퇴'}})
    fireEvent.submit(screen.getByRole('button', {name: '회원 탈퇴'}))

    await waitFor(() => expect(deleteAccount).toHaveBeenCalledOnce())
    expect(screen.getByLabelText('이메일')).toHaveValue('member@example.com')
    expect(navigate).toHaveBeenCalledWith('/', {replace: true})
  })

  it('should submit sign-up credentials then navigate to sign-in', async () => {
    signUp.mockResolvedValueOnce(undefined)
    render(() => <SignUp />)

    fireEvent.input(screen.getByLabelText('Email'), {target: {value: 'new@example.com'}})
    fireEvent.input(screen.getByLabelText('Password'), {target: {value: 'new-password'}})
    fireEvent.submit(screen.getByRole('button', {name: 'Sign Up'}))

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'new-password',
        redirectTo: '/auth/verify-email',
      }),
    )
    expect(navigate).toHaveBeenCalledWith('/auth/sign-in')
  })
})
