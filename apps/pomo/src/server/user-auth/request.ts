import {authenticateAppRequest} from './http'
import {getNeonSession} from './neon-session'
import {findOrCreateNeonUser} from './repository'

export interface UserRequestIdentity {
  readonly cookies: ReadonlyArray<string>
  readonly userId: string | null
}

/** Resolves either an Apps in Toss bearer session or a regular web cookie session. */
export const authenticateUserRequest = async (request: Request): Promise<UserRequestIdentity> => {
  if (request.headers.has('Authorization')) {
    const identity = await authenticateAppRequest(request)
    return {cookies: [], userId: identity?.userId ?? null}
  }

  const session = await getNeonSession(request)
  const userId = session.identity === null ? null : await findOrCreateNeonUser(session.identity.id)
  return {cookies: session.cookies, userId}
}
