import {signIn} from '@auth/solid-start/client'
import {getRequestEvent} from 'solid-js/web'
import {createResource} from 'solid-js'

export type SupportedProviders = 'github'

const getSession = async () => {
  'use server'

  return getRequestEvent()?.locals.session
}

const useSession = () => {
  const [session] = createResource(getSession)

  return session
}

export default function SignIn() {
  const session = useSession()

  return (
    <main>
      <span>{session()?.user?.email}</span>
      <br />
      <span>Github</span>
      <br />
      <button onClick={() => signIn('github')}>Sign in with Github</button>
    </main>
  )
}
