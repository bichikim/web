import {getAuthSession} from './get-auth-session'
import {findOrCreateNeonUser} from './repository'
import {UserRequestResolutionError} from './user-request-resolution-error'

export interface UserRequestIdentity {
  readonly cookies: ReadonlyArray<string>
  readonly userId: string | null
}

/** Resolves a Pomo user ID, creating the web user when an authenticated Neon identity needs one. */
export const resolveUserRequest = async (request: Request): Promise<UserRequestIdentity> => {
  const session = await getAuthSession(request)
  if (session.provider === 'toss') {
    return {cookies: session.setCookies, userId: session.userId}
  }

  if (session.identity === null) {
    return {cookies: session.setCookies, userId: null}
  }

  let userId: string
  try {
    userId = await findOrCreateNeonUser(session.identity.id)
  } catch (error) {
    throw new UserRequestResolutionError(session.setCookies, error)
  }

  return {cookies: session.setCookies, userId}
}
