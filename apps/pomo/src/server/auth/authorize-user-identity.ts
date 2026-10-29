import {noStoreJson} from '../http/response'
import type {UserRequestIdentity} from './resolve-user-request'

const HTTP_UNAUTHORIZED = 401
const HTTP_SERVICE_UNAVAILABLE = 503

interface AuthorizedUserIdentity {
  readonly authorized: true
  readonly cookies: ReadonlyArray<string>
  readonly userId: string
}

interface RejectedUserIdentity {
  readonly authorized: false
  readonly response: Response
}

export type UserAuthorization = AuthorizedUserIdentity | RejectedUserIdentity

/** Rejects invalid sessions before missing users, preserving private responses and refreshed cookies. */
export const authorizeUserIdentity = (identity: UserRequestIdentity): UserAuthorization => {
  if (identity.access === 'invalid') {
    return {
      authorized: false,
      response: noStoreJson(
        {error: 'authentication_unavailable'},
        {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
      ),
    }
  }

  const {userId} = identity
  if (userId === null) {
    return {
      authorized: false,
      response: noStoreJson(
        {error: 'unauthorized'},
        {cookies: identity.cookies, status: HTTP_UNAUTHORIZED},
      ),
    }
  }

  return {authorized: true, cookies: identity.cookies, userId}
}
