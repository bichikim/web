import {SignIn} from './_components/SignIn'
import {useAuth} from 'src/store/auth'
import {createSignal} from 'solid-js'
import {createEffect} from 'solid-js'
import {useNameNavigate} from 'src/components/anchor/nameNavigate'

export default function Login() {
  const {signInWithPassword, signInError, user, loading} = useAuth()
  const navigate = useNameNavigate()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')

  const handleLogin = async () => {
    await signInWithPassword(email(), password())
  }

  createEffect(() => {
    if (user()) {
      navigate('home')
    }
  })

  return (
    <SignIn
      email={email()}
      error={signInError()}
      loading={loading()}
      onLogin={handleLogin}
      onUpdateEmail={setEmail}
      onUpdatePassword={setPassword}
      password={password()}
    />
  )
}
