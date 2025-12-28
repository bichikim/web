import {RouteSectionProps, useNavigate} from '@solidjs/router'
import {useAuth} from 'src/store/auth'
import {createMemo} from 'solid-js'
import {SIGN_IN_PATH} from 'src/utils/route-names'

const useAuthGuard = () => {
  const navigate = useNavigate()
  const {user} = useAuth()

  const isSignedIn = createMemo(() => user() !== null)

  if (!isSignedIn()) {
    return navigate(SIGN_IN_PATH)
  }
}

export function AuthGuard(props: RouteSectionProps) {
  useAuthGuard()

  return <div>{props.children}</div>
}
