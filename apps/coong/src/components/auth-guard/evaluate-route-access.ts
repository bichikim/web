import type {RouteMatch} from '@solidjs/router'
import type {AuthSessionState, RouteAccessResult} from './allow'
import {isAllowAll} from './is-allow-all'

export const evaluateRouteAccess = (
  matches: RouteMatch[],
  session: AuthSessionState,
): RouteAccessResult => {
  if (session === 'loading') {
    return {
      allow: false,
      pending: true,
      reason: 'public',
      session,
    }
  }

  const access = isAllowAll(matches, session === 'authenticated')

  return {
    ...access,
    pending: false,
    session,
  }
}
