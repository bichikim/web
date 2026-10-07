import type {APIEvent} from '@solidjs/start/server'

import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'
import {getAiTextAccess} from 'src/server/ai/service'
import {noStoreJson} from 'src/server/http/response'

const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401

export const GET = async (event: APIEvent): Promise<Response> => {
  const resolved = await resolveUserRequestOrUnavailable(event.request, {
    logMessage: 'Failed to resolve AI access user',
    unavailableError: 'ai_access_unavailable',
  })
  if (resolved.kind === 'unavailable') {
    return resolved.response
  }
  const {identity} = resolved

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
