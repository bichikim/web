import {SignIn} from './_components/SignIn'
import {useAuth} from 'src/store/auth'
import {createEffect, createSignal} from 'solid-js'
import {RouteDefinition, useNavigate} from '@solidjs/router'

export const route = {
  info: {
    public: 'only-unauthorized',
  },
} satisfies RouteDefinition

export default function Login() {
  const {signInWithPassword, user} = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')

  const handleLogin = async () => {
    await signInWithPassword({email: email(), password: password()})
  }

  createEffect(() => {
    if (user()) {
      navigate('/')
    }
  })

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
