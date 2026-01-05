import {RouteSectionProps} from '@solidjs/router'
import {useAuth} from 'src/store/auth'
import {createMemo} from 'solid-js'
import {useNameNavigate} from 'src/components/anchor/nameNavigate'

/**
 * A custom hook that checks if the user is signed in and redirects to the sign in page if not.
 * @returns
 */
const useAuthGuard = () => {
  const navigate = useNameNavigate()
  const {user} = useAuth()

  const isSignedIn = createMemo(() => user() !== null)

  if (!isSignedIn()) {
    return navigate('sign-in')
  }
}

export function AuthGuard(props: RouteSectionProps) {
  useAuthGuard()

  return <div>{props.children}</div>
}
