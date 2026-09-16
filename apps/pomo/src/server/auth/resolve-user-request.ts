import {getAuthSession} from './get-auth-session'
import {findOrCreateNeonUser} from './repository'

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

  const userId = session.identity === null ? null : await findOrCreateNeonUser(session.identity.id)
  return {cookies: session.setCookies, userId}
}
