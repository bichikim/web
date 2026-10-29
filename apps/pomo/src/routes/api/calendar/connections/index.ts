import {authorizeUserIdentity} from 'src/server/auth/authorize-user-identity'
import type {APIEvent} from '@solidjs/start/server'

import {listCalendarConnections} from 'src/server/calendar/runtime'
import {noStoreJson} from 'src/server/http/response'
import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'

const HTTP_SERVICE_UNAVAILABLE = 503

export const GET = async (event: APIEvent): Promise<Response> => {
  const resolved = await resolveUserRequestOrUnavailable(event.request, {
    logMessage: 'Failed to resolve calendar user',
    unavailableError: 'calendar_connections_unavailable',
  })
  if (resolved.kind === 'unavailable') {
    return resolved.response
  }
  const identity = authorizeUserIdentity(resolved.identity)
  if (!identity.authorized) {
    return identity.response
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
