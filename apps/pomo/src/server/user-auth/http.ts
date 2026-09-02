import {resolveAppSessionUserId} from './repository'
import {readBearerToken} from './token'

export interface AppRequestIdentity {
  readonly token: string
  readonly userId: string
}

export const authenticateAppRequest = async (
  request: Request,
): Promise<AppRequestIdentity | null> => {
  const token = readBearerToken(request)

  if (token === null) {
    return null
  }

  const userId = await resolveAppSessionUserId(token)
  return userId === null ? null : {token, userId}
}
