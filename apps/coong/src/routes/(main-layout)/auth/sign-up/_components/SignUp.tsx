import {createMemo, createSignal} from 'solid-js'
import {signUpAction} from 'src/requests/auth/sign-up'
import {A, useAction, useNavigate, useSubmission} from '@solidjs/router'
import {AuthSubmitButton} from '../../_components/AuthSubmitButton'
import {AuthSurface} from '../../_components/AuthSurface'
import {AuthTextField} from '../../_components/AuthTextField'

export const SignUp = () => {
  const signUpSubmission = useSubmission(signUpAction)
  const _signUpAction = useAction(signUpAction)
  const navigate = useNavigate()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')

  const handleSignUp = async (event: Event) => {
    event.preventDefault()

    await _signUpAction({
      email: email(),
      password: password(),
      redirectTo: '/auth/verify-email',
    })
    navigate('/auth/sign-in')
  }

  const error = createMemo(() => signUpSubmission.error)
  const loading = createMemo(() => signUpSubmission.pending)

  return (
    <AuthSurface
      title="Sign Up"
      footer={
        <div class=":uno: mt-4 text-center">
          <A href="/auth/sign-in" class=":uno: text-#4b5bdc no-underline hover:underline">
            Already have an account? Sign In
          </A>
        </div>
      }
    >
      <form onSubmit={handleSignUp} class=":uno: flex flex-col gap-4">
        <AuthTextField
          id="sign-up-email"
          type="email"
          label="Email"
          placeholder="Email"
          value={email()}
          autocomplete="email"
          onChange={setEmail}
          required
        />
        <AuthTextField
          id="sign-up-password"
          type="password"
          label="Password"
          placeholder="Password"
          autocomplete="new-password"
          value={password()}
          onChange={setPassword}
          required
        />
        {error() && <p class=":uno: m-0 text-3.5 text-#d13b3b">{error()}</p>}
        <AuthSubmitButton disabled={loading()}>
          {loading() ? 'Loading...' : 'Sign Up'}
        </AuthSubmitButton>
      </form>
    </AuthSurface>
  )
}
