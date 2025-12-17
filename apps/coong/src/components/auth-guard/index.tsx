import {RouteSectionProps, useNavigate} from '@solidjs/router'
import {useAuth} from 'src/store/auth'
import {createMemo} from 'solid-js'

const SignInPath = '/auth/sign-in'

const useAuthGuard = () => {
  const navigate = useNavigate()
  const {user} = useAuth()

  const isSignedIn = createMemo(() => user() !== null)

  if (!isSignedIn()) {
    return navigate(SignInPath)
  }
}

export function AuthGuard(props: RouteSectionProps) {
  useAuthGuard()

  return <div>{props.children}</div>
}
