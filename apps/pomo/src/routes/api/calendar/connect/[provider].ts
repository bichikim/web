import {authorizeUserIdentity} from 'src/server/auth/authorize-user-identity'
import type {APIEvent} from '@solidjs/start/server'

import {isCalendarProviderId} from 'src/features/calendar'
import {getCalendarService} from 'src/server/calendar/runtime'
import {noStoreJson} from 'src/server/http/response'
import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'

const HTTP_BAD_REQUEST = 400
const HTTP_SERVICE_UNAVAILABLE = 503

export const POST = async (event: APIEvent): Promise<Response> => {
  if (!isCalendarProviderId(event.params.provider)) {
    return noStoreJson({error: 'unsupported_calendar_provider'}, {status: HTTP_BAD_REQUEST})
  }

  const resolved = await resolveUserRequestOrUnavailable(event.request, {
    logMessage: 'Failed to resolve calendar user',
    unavailableError: 'calendar_connection_unavailable',
  })
  if (resolved.kind === 'unavailable') {
    return resolved.response
  }
  const identity = authorizeUserIdentity(resolved.identity)
  if (!identity.authorized) {
    return identity.response
  }

  try {
    const {provider} = event.params
    const redirectUri = new URL(`/api/calendar/callback/${provider}`, event.request.url).href
    const authorizationUrl = await getCalendarService().beginConnection({
      provider,
      redirectUri,
      userId: identity.userId,
    })
    return noStoreJson({authorizationUrl}, {cookies: identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to start calendar authorization', error)
    return noStoreJson(
      {error: 'calendar_connection_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
