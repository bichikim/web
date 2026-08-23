import type {APIEvent} from '@solidjs/start/server'

import {noStoreJson} from 'src/server/http/response'
import {authenticateAppRequest} from 'src/server/user-auth/http'
import {revokeAppSession} from 'src/server/user-auth/repository'

const HTTP_UNAUTHORIZED = 401

export const GET = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticateAppRequest(event.request)

  return identity === null
    ? noStoreJson({authenticated: false}, {status: HTTP_UNAUTHORIZED})
    : noStoreJson({authenticated: true, userId: identity.userId})
}

export const DELETE = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticateAppRequest(event.request)

  if (identity === null) {
    return noStoreJson({authenticated: false}, {status: HTTP_UNAUTHORIZED})
  }

  await revokeAppSession(identity.token)
  return noStoreJson({authenticated: false})
}
