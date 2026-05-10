import {createMemo, createSignal} from 'solid-js'
import {signUpAction} from 'src/requests/auth/sign-up'
import {A, useAction, useNavigate, useSubmission} from '@solidjs/router'

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
    <div class="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div class="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 class="text-2xl font-bold mb-6 text-center">Sign Up</h1>
        <form onSubmit={handleSignUp} class="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email()}
            autocomplete="email"
            onInput={(event) => setEmail(event.currentTarget.value)}
            class="p-2 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            autocomplete="new-password"
            value={password()}
            onInput={(event) => setPassword(event.currentTarget.value)}
            class="p-2 border rounded"
            required
          />
          {error() && <p class="text-red-500 text-sm">{error()}</p>}
          <button
            type="submit"
            disabled={loading()}
            class="p-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading() ? 'Loading...' : 'Sign Up'}
          </button>
        </form>
        <div class="mt-4 text-center">
          <A href="/auth/sign-in" class="text-blue-500 hover:underline">
            Already have an account? Sign In
          </A>
        </div>
      </div>
    </div>
  )
}
