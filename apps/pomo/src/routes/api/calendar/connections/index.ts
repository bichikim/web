import type {APIEvent} from '@solidjs/start/server'

import {listCalendarConnections} from 'src/server/calendar/runtime'
import {noStoreJson} from 'src/server/http/response'
import {authenticateUserRequest} from 'src/server/user-auth/request'

const HTTP_UNAUTHORIZED = 401
const HTTP_SERVICE_UNAVAILABLE = 503

export const GET = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticateUserRequest(event.request)
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
