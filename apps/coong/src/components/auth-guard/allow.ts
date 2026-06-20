import type {RouteMatch} from '@solidjs/router'

export type AuthSessionState = 'authenticated' | 'loading' | 'unauthenticated'

export type NotAllowType = 'only-unauthorized' | 'public' | 'authorized'

export interface IsAllowAllResult {
  allow: boolean
  reason: NotAllowType
}

export interface RouteAccessResult extends IsAllowAllResult {
  pending: boolean
  session: AuthSessionState
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

export const resolveAuthSession = (user: unknown): AuthSessionState => {
  if (user === undefined) {
    return 'loading'
  }

  if (user === null) {
    return 'unauthenticated'
  }

  return 'authenticated'
}

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
