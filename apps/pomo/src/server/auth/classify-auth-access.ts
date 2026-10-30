import {isPlainObject} from 'es-toolkit/predicate'

import {parseCommaSeparated} from 'src/utils/parse-comma-separated'
import type {AuthAccess} from './types'

const ADMIN_ROLE = 'admin'

const hasAdminRole = (role: unknown): boolean => {
  if (typeof role === 'string') {
    return parseCommaSeparated(role).includes(ADMIN_ROLE)
  }

  return (
    Array.isArray(role) &&
    role.every((value) => typeof value === 'string') &&
    role.includes(ADMIN_ROLE)
  )
}

export const classifyAuthAccess = (sessionData: unknown): AuthAccess => {
  if (sessionData === null) {
    return 'anonymous'
  }

  if (!isPlainObject(sessionData)) {
    return 'invalid'
  }

  const {session, user} = sessionData

  if (session === null && user === null) {
    return 'anonymous'
  }

  if (!isPlainObject(session) || !isPlainObject(user)) {
    return 'invalid'
  }

  return hasAdminRole(user.role) ? 'admin' : 'user'
}
