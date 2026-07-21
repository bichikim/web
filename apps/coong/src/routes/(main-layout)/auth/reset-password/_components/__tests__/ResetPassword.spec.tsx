/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {JSX} from 'solid-js'
import {ResetPassword} from '../ResetPassword'

const resetPassword = vi.fn()

vi.mock('src/store/auth', () => ({
  useAuth: () => ({
    resetPassword,
  }),
}))

vi.mock('src/routes/(main-layout)/auth/_components/AuthSurface', () => ({
  AuthSurface: (props: {children: JSX.Element; title: string}) => (
    <section>
      <h1>{props.title}</h1>
      {props.children}
    </section>
  ),
}))

vi.mock('src/routes/(main-layout)/auth/_components/AuthTextField', () => ({
  AuthTextField: (props: {
    id: string
    label: string
    onChange: (value: string) => void
    value: string
  }) => (
    <label for={props.id}>
      {props.label}
      <input
        id={props.id}
        value={props.value}
        onInput={(event) => props.onChange(event.currentTarget.value)}
      />
    </label>
  ),
}))

vi.mock('src/routes/(main-layout)/auth/_components/AuthSubmitButton', () => ({
  AuthSubmitButton: (props: {children: JSX.Element}) => (
    <button type="submit">{props.children}</button>
  ),
}))

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show an error when reset password fails', async () => {
    resetPassword.mockRejectedValueOnce(new Error('Rate limit exceeded'))

    render(() => <ResetPassword />)

    fireEvent.input(screen.getByLabelText('이메일 주소'), {
      target: {value: 'user@example.com'},
    })
    fireEvent.submit(screen.getByRole('button', {name: '재설정 링크 전송'}))

    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
    })
  })

  it('should show success when reset password succeeds', async () => {
    resetPassword.mockResolvedValueOnce(undefined)

    render(() => <ResetPassword />)

    fireEvent.input(screen.getByLabelText('이메일 주소'), {
      target: {value: 'user@example.com'},
    })
    fireEvent.submit(screen.getByRole('button', {name: '재설정 링크 전송'}))

    await waitFor(() => {
      expect(screen.getByText('이메일로 패스워드 재설정 링크를 전송했습니다.')).toBeInTheDocument()
    })
  })
})
