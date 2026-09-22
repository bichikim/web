import type {APIEvent} from '@solidjs/start/server'

import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {getAiTextAccess} from 'src/server/ai/service'
import {noStoreJson} from 'src/server/http/response'

const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401

export const GET = async (event: APIEvent): Promise<Response> => {
  let identity: Awaited<ReturnType<typeof resolveUserRequest>>
  try {
    identity = await resolveUserRequest(event.request)
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }

    console.error('Failed to resolve AI access user', error.cause)
    return noStoreJson(
      {error: 'ai_access_unavailable'},
      {cookies: error.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

  if (identity.userId === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: identity.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  try {
    return noStoreJson(await getAiTextAccess(identity.userId), {cookies: identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to read AI access', error)
    return noStoreJson(
      {error: 'ai_access_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
