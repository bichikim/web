import {isPlainObject} from 'es-toolkit/predicate'

import {hasListItem} from 'src/utils/has-list-item'
import type {AuthAccess} from './types'

const ADMIN_ROLE = 'admin'

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

  return hasListItem(user.role, ADMIN_ROLE) ? 'admin' : 'user'
}
