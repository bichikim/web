import {SignIn} from './_components/SignIn'
import {useAuth} from 'src/store/auth'
import {useNavigate} from '@solidjs/router'
import {createSignal} from 'solid-js'
import {HOME_PATH} from 'src/utils/route-names'
import {createEffect} from 'solid-js'

export default function Login() {
  const {signInWithPassword, signInError, user, loading} = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')

  const handleLogin = async () => {
    await signInWithPassword(email(), password())
  }

  createEffect(() => {
    if (user()) {
      navigate(HOME_PATH)
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
