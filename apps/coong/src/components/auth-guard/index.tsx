import {RouteSectionProps} from '@solidjs/router'
import {useAuth} from 'src/store/auth'
import {createMemo, untrack, JSX} from 'solid-js'
import {useLocation} from '@solidjs/router'
import {useCurrentMatches, RouteMatch, RouteDefinition as _RouteDefinition} from '@solidjs/router'
import {useNameNavigate} from 'src/components/anchor/nameNavigate'

export interface RouteDefinition extends _RouteDefinition {
  info: {
    public: 'only-unauthorized' | true
  }
}

export type NotAllowType = 'only-unauthorized' | 'public' | 'authorized'

export interface IsAllowAllResult {
  allow: boolean
  reason: NotAllowType
}

const isAllow = (match: RouteMatch, authorized: boolean): IsAllowAllResult => {
  const publicInfo = match.route?.info?.public

  if (publicInfo === 'only-unauthorized') {
    return {
      allow: !authorized,
      reason: 'only-unauthorized',
    }
  }

  if (authorized) {
    return {
      allow: true,
      reason: 'authorized',
    }
  }

  return {
    allow: publicInfo ?? false,
    reason: 'public',
  }
}

export const isAllowAll = (matches: RouteMatch[], authorized: boolean): IsAllowAllResult => {
  for (const match of matches) {
    const result = isAllow(match, authorized)

    if (!result.allow) {
      return result
    }
  }

  return {
    allow: true,
    reason: 'public',
  }
}

export const useAuthGuard = () => {
  const {user, restoreLoading} = useAuth()
  const navigate = useNameNavigate()
  const location = useLocation()
  const matches = useCurrentMatches()

  const allPublic = createMemo(() => isAllowAll(matches(), user() !== null))

  const handleRedirectSignIn = () => {
    console.log('redirecting to sign in')
    navigate('sign-in')
  }

  if (untrack(() => !restoreLoading() && !allPublic().allow)) {
    handleRedirectSignIn()
  }
}

export const AuthGuard = (props: {children: JSX.Element}) => {
  useAuthGuard()

  return <>{props.children}</>
}
