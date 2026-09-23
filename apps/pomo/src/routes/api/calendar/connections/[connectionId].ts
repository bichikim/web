import type {APIEvent} from '@solidjs/start/server'

import {deleteCalendarConnection} from 'src/server/calendar/runtime'
import {noStoreEmpty, noStoreJson} from 'src/server/http/response'
import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'

const HTTP_NOT_FOUND = 404
const HTTP_UNAUTHORIZED = 401
const HTTP_SERVICE_UNAVAILABLE = 503

export const DELETE = async (event: APIEvent): Promise<Response> => {
  const resolved = await resolveUserRequestOrUnavailable(event.request, {
    logMessage: 'Failed to resolve calendar user',
    unavailableError: 'calendar_connection_unavailable',
  })
  if (resolved.kind === 'unavailable') {
    return resolved.response
  }
  const {identity} = resolved
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
    const deleted = await deleteCalendarConnection(identity.userId, event.params.connectionId)
    return deleted
      ? noStoreEmpty({cookies: identity.cookies})
      : noStoreJson(
          {error: 'calendar_connection_not_found'},
          {cookies: identity.cookies, status: HTTP_NOT_FOUND},
        )
  } catch (error: unknown) {
    console.error('Failed to delete calendar connection', error)
    return noStoreJson(
      {error: 'calendar_connection_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
