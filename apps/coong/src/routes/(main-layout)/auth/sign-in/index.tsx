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

  const handleLogin = async () => {
    await signInWithPassword({email: email(), password: password()})
  }

  return (
    <SignIn
      email={email()}
      error={null}
      loading={false}
      onLogin={handleLogin}
      onUpdateEmail={setEmail}
      onUpdatePassword={setPassword}
      password={password()}
    />
  )
}
