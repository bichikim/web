import {createMemo, JSX, Match, Show, Switch} from 'solid-js'
import {
  RouteDefinition as _RouteDefinition,
  createAsync,
  Navigate,
  useCurrentMatches,
} from '@solidjs/router'
import {userQuery} from 'src/requests/auth/user'
import {evaluateRouteAccess, resolveAuthSession} from './allow'

export type {AuthSessionState, IsAllowAllResult, NotAllowType, RouteAccessResult} from './allow'
export {evaluateRouteAccess, isAllowAll, resolveAuthSession} from './allow'

export const useAuthGuard = () => {
  const user = createAsync(() => userQuery(), {deferStream: true})
  const matches = useCurrentMatches()

  const routeAccess = createMemo(() => evaluateRouteAccess(matches(), resolveAuthSession(user())))

  return routeAccess
}

export interface AuthGuardProps {
  children: JSX.Element
  /**
   * @default '/auth/sign-in'
   */
  signInUrl?: string
  /**
   * @default '/'
   */
  homeUrl?: string

  pending?: JSX.Element
}

export const AuthGuard = (props: AuthGuardProps) => {
  const routeAccess = useAuthGuard()
  const signInUrl = createMemo(() => props.signInUrl ?? '/auth/sign-in')
  const homeUrl = createMemo(() => props.homeUrl ?? '/')
  return (
    <Show when={!routeAccess().pending} fallback={props.pending ?? null}>
      <Show
        when={routeAccess().allow}
        fallback={
          <Switch>
            <Match when={routeAccess().reason === 'only-unauthorized'}>
              <Navigate href={homeUrl()} />
            </Match>
            <Match when={routeAccess().reason === 'authorized'}>
              <Navigate href={signInUrl()} />
            </Match>
          </Switch>
        }
      >
        {props.children}
      </Show>
    </Show>
  )
}
