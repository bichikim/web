import type {RouteMatch} from '@solidjs/router'

export type NotAllowType = 'only-unauthorized' | 'public' | 'authorized'

export interface IsAllowAllResult {
  allow: boolean
  reason: NotAllowType
}

export const isAllow = (match: RouteMatch, authorized: boolean): IsAllowAllResult => {
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
