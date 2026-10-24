import {A} from '@solidjs/router'
import {AuthSubmitButton} from '../../_components/AuthSubmitButton'
import {AuthSurface} from '../../_components/AuthSurface'
import {AuthTextField} from '../../_components/AuthTextField'

export interface SignInProps {
  email: string
  error: Error | null
  loading: boolean
  onLogin: () => Promise<void>
  onUpdateEmail: (email: string) => void
  onUpdatePassword: (password: string) => void
  password: string
}

export const SignIn = (props: SignInProps) => {
  const handleLogin = async (event: Event) => {
    event.preventDefault()
    await props.onLogin()
  }

  return (
    <AuthSurface
      title="Sign In"
      footer={
        <div class=":uno: mt-4 text-center">
          <A href="/auth/sign-up" class=":uno: text-#4b5bdc no-underline hover:underline">
            Don't have an account? Sign Up
          </A>
        </div>
      }
    >
      <form onSubmit={handleLogin} class=":uno: flex flex-col gap-4">
        <AuthTextField
          id="sign-in-email"
          type="email"
          label="Email"
          placeholder="Email"
          value={props.email}
          autocomplete="email"
          onChange={props.onUpdateEmail}
          required
        />
        <AuthTextField
          id="sign-in-password"
          type="password"
          label="Password"
          placeholder="Password"
          autocomplete="current-password"
          value={props.password}
          onChange={props.onUpdatePassword}
          required
        />
        {props.error && <p class=":uno: m-0 text-3.5 text-#d13b3b">{props.error?.message}</p>}
        <AuthSubmitButton disabled={props.loading}>
          {props.loading ? 'Loading...' : 'Sign In'}
        </AuthSubmitButton>
      </form>
    </AuthSurface>
  )
}
