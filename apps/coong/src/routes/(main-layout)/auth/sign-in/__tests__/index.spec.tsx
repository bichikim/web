/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import Login from '../index'

const signInWithPassword = vi.fn()

vi.mock('src/store/auth', () => ({
  useAuth: () => ({signInWithPassword}),
}))

vi.mock('../_components/SignIn', () => ({
  SignIn: (props: {
    email: string
    error: Error | null
    loading: boolean
    onLogin: () => Promise<void>
    onUpdateEmail: (email: string) => void
    onUpdatePassword: (password: string) => void
    password: string
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        return props.onLogin()
      }}
    >
      <label for="email">
        Email
        <input
          id="email"
          value={props.email}
          onInput={(event) => props.onUpdateEmail(event.currentTarget.value)}
        />
      </label>
      <label for="password">
        Password
        <input
          id="password"
          value={props.password}
          onInput={(event) => props.onUpdatePassword(event.currentTarget.value)}
        />
      </label>
      <button type="submit" disabled={props.loading}>
        {props.loading ? 'Loading...' : 'Sign In'}
      </button>
      {props.error?.message}
    </form>
  ),
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show a sign-in error and restore the submit button', async () => {
    signInWithPassword.mockRejectedValueOnce(new Error('Invalid credentials'))
    render(() => <Login />)

    fireEvent.input(screen.getByLabelText('Email'), {target: {value: 'user@example.com'}})
    fireEvent.input(screen.getByLabelText('Password'), {target: {value: 'wrong-password'}})
    fireEvent.submit(screen.getByRole('button', {name: 'Sign In'}))

    expect(screen.getByRole('button', {name: 'Loading...'})).toBeDisabled()

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
      expect(screen.getByRole('button', {name: 'Sign In'})).not.toBeDisabled()
    })
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'wrong-password',
    })
  })
})
