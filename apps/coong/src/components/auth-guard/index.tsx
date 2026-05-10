import {createMemo, JSX, Show} from 'solid-js'
import {
  RouteDefinition as _RouteDefinition,
  createAsync,
  Navigate,
  RouteMatch,
  useCurrentMatches,
} from '@solidjs/router'
import {userQuery} from 'src/requests/auth/user'

export interface RouteDefinition extends _RouteDefinition {
  info: {
    /**
     * Controls route access based on user authentication status.
     *
     * - `true`: Accessible to everyone (public route)
     * - `false`: Requires authentication (private route, redirects to sign-in if not logged in)
     * - `'only-unauthorized'`: Only accessible when NOT logged in (e.g., sign-in, sign-up pages)
     *   - Logged-in users are redirected to home
     */
    public: 'only-unauthorized' | boolean
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
  const reason = disAllowIndex === -1 ? 'public' : results[disAllowIndex].reason

  return {
    allow: disAllowIndex === -1,
    reason,
  }
}

export const useAuthGuard = () => {
  const user = createAsync(() => userQuery(), {deferStream: true})
  const matches = useCurrentMatches()

  const allPublic = createMemo(() => isAllowAll(matches(), user() !== null))

  return createMemo(() => allPublic().allow)
}

export const AuthGuard = (props: {children: JSX.Element}) => {
  const isAllowed = useAuthGuard()
  return (
    <Show when={isAllowed()} fallback={<Navigate href="/auth/sign-in" />}>
      {props.children}
    </Show>
  )
}
