import {findOrCreateNeonUser} from '../repositories/auth'
import {getAuthSession} from './get-auth-session'
import {UserRequestResolutionError} from './user-request-resolution-error'
import type {AuthAccess} from './types'

export interface UserRequestIdentity {
  readonly access: AuthAccess
  readonly cookies: ReadonlyArray<string>
  readonly userId: string | null
}

/** Resolves a Pomo user ID, creating the web user when an authenticated Neon identity needs one. */
export const resolveUserRequest = async (request: Request): Promise<UserRequestIdentity> => {
  const session = await getAuthSession(request)

  if (session.access === 'invalid') {
    return {access: session.access, cookies: session.setCookies, userId: null}
  }

  if (session.provider === 'toss') {
    return {access: session.access, cookies: session.setCookies, userId: session.userId}
  }

  if (session.identity === null) {
    return {access: session.access, cookies: session.setCookies, userId: null}
  }

  let userId: string
  try {
    userId = await findOrCreateNeonUser(session.identity.id)
  } catch (error) {
    throw new UserRequestResolutionError(session.setCookies, error)
  }

  return {access: session.access, cookies: session.setCookies, userId}
}
