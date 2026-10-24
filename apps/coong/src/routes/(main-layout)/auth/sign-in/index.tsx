import {SignIn} from './_components/SignIn'
import {useAuth} from 'src/store/auth'
import {createSignal} from 'solid-js'
import {RouteDefinition} from '@solidjs/router'

export const route = {
  info: {
    public: 'only-unauthorized',
  },
} satisfies RouteDefinition

export default function Login() {
  const {signInWithPassword} = useAuth()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal<Error | null>(null)
  const [loading, setLoading] = createSignal(false)

  const handleLogin = async () => {
    if (loading()) {
      return
    }

    setError(null)
    setLoading(true)

    try {
      await signInWithPassword({email: email(), password: password()})
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError : new Error('Sign in failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <SignIn
      email={email()}
      error={error()}
      loading={loading()}
      onLogin={handleLogin}
      onUpdateEmail={setEmail}
      onUpdatePassword={setPassword}
      password={password()}
    />
  )
}
