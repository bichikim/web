import {useAuth} from 'src/store/auth'
import {createMemo, untrack, JSX} from 'solid-js'
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
  const results = matches.map((match) => isAllow(match, authorized))

  const disAllowIndex = results.findIndex((result) => !result.allow)
  const reason = disAllowIndex !== -1 ? results[disAllowIndex].reason : 'public'

  return {
    allow: disAllowIndex === -1,
    reason,
  }
}

export const useAuthGuard = () => {
  const {user, restoreLoading} = useAuth()
  const navigate = useNameNavigate()
  const matches = useCurrentMatches()

  const allPublic = createMemo(() => isAllowAll(matches(), user() !== null))

  const handleRedirectSignIn = () => {
    navigate('sign-in')
  }

  const handleRedirectHome = () => {
    navigate('home')
  }

  const _allPublic = untrack(() => allPublic())

  if (untrack(() => !restoreLoading() && !_allPublic.allow)) {
    if (_allPublic.reason === 'only-unauthorized') {
      handleRedirectHome()
    } else {
      handleRedirectSignIn()
    }
  }
}

export const AuthGuard = (props: {children: JSX.Element}) => {
  useAuthGuard()

  return <>{props.children}</>
}
