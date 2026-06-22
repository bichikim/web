import {createMemo} from 'solid-js'
import {createAsync, useCurrentMatches} from '@solidjs/router'
import {userQuery} from 'src/requests/auth/user'
import {evaluateRouteAccess} from './evaluate-route-access'
import {resolveAuthSession} from './allow'

export const useAuthGuard = () => {
  const user = createAsync(() => userQuery(), {deferStream: true})
  const matches = useCurrentMatches()

  return createMemo(() => evaluateRouteAccess(matches(), resolveAuthSession(user())))
}
