import type {APIEvent} from '@solidjs/start/server'

import {listCalendarConnections} from 'src/server/calendar/runtime'
import {noStoreJson} from 'src/server/http/response'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'

const HTTP_UNAUTHORIZED = 401
const HTTP_SERVICE_UNAVAILABLE = 503

export const GET = async (event: APIEvent): Promise<Response> => {
  let identity: Awaited<ReturnType<typeof resolveUserRequest>>
  try {
    identity = await resolveUserRequest(event.request)
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }
    console.error('Failed to resolve calendar user', error.cause)
    return noStoreJson(
      {error: 'calendar_connections_unavailable'},
      {cookies: error.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
  if (identity.access === 'invalid') {
    return noStoreJson(
      {error: 'authentication_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

  if (identity.userId === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: identity.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  try {
    const connections = await listCalendarConnections(identity.userId)
    return noStoreJson({connections}, {cookies: identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to list calendar connections', error)
    return noStoreJson(
      {error: 'calendar_connections_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
