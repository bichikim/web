import type {RouteMatch} from '@solidjs/router'
import {isAllow, type IsAllowAllResult} from './is-allow'

export const isAllowAll = (matches: RouteMatch[], authorized: boolean): IsAllowAllResult => {
  const results = matches.map((match) => isAllow(match, authorized))

  const disAllowIndex = results.findIndex((result) => !result.allow)
  const reason = disAllowIndex === -1 ? 'public' : results[disAllowIndex].reason

  return {
    allow: disAllowIndex === -1,
    reason,
  }
}
