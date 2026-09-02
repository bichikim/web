import type {APIEvent} from '@solidjs/start/server'

import {noStoreJson} from 'src/server/http/response'
import {authenticateAppRequest} from 'src/server/user-auth/http'
import {resolveAppSessionUserId, revokeAppSession} from 'src/server/user-auth/repository'
import {readBearerToken} from 'src/server/user-auth/token'

const HTTP_UNAUTHORIZED = 401

export const GET = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticateAppRequest(event.request)

  return identity === null
    ? noStoreJson({authenticated: false}, {status: HTTP_UNAUTHORIZED})
    : noStoreJson({authenticated: true, userId: identity.userId})
}

export const PATCH = async (event: APIEvent): Promise<Response> => {
  const token = readBearerToken(event.request)

  if (token === null || (await resolveAppSessionUserId(token)) === null) {
    return noStoreJson({authenticated: false}, {status: HTTP_UNAUTHORIZED})
  }

  return noStoreJson({authenticated: true})
}

export const DELETE = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticateAppRequest(event.request)

  if (identity === null) {
    return noStoreJson({authenticated: false}, {status: HTTP_UNAUTHORIZED})
  }

  await revokeAppSession(identity.token)
  return noStoreJson({authenticated: false})
}
