import type {APIEvent} from '@solidjs/start/server'

import {type CalendarProviderId, isCalendarProviderId} from 'src/features/calendar'
import {getCalendarService} from 'src/server/calendar/runtime'
import {noStoreText} from 'src/server/http/response'

const HTTP_BAD_REQUEST = 400
const HTTP_SERVICE_UNAVAILABLE = 503

const redirectToAccount = (requestUrl: string, outcome: string, provider?: CalendarProviderId) => {
  const url = new URL('/account', requestUrl)
  url.searchParams.set('calendar', outcome)
  if (provider !== undefined) {
    url.searchParams.set('provider', provider)
  }
  return new Response(null, {
    headers: {
      'Cache-Control': 'no-store',
      Location: url.href,
      Pragma: 'no-cache',
      'Referrer-Policy': 'no-referrer',
    },
    status: 302,
  })
}

export const GET = async (event: APIEvent): Promise<Response> => {
  if (!isCalendarProviderId(event.params.provider)) {
    return noStoreText('Unsupported calendar provider', {status: HTTP_BAD_REQUEST})
  }

  const url = new URL(event.request.url)
  if (url.searchParams.has('error')) {
    return redirectToAccount(event.request.url, 'cancelled')
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (code === null || state === null || code.length === 0 || state.length === 0) {
    return redirectToAccount(event.request.url, 'invalid')
  }

  try {
    const completed = await getCalendarService().completeConnection({
      code,
      provider: event.params.provider,
      state,
    })
    return redirectToAccount(
      event.request.url,
      completed ? 'connected' : 'invalid',
      completed ? event.params.provider : undefined,
    )
  } catch (error: unknown) {
    console.error('Failed to complete calendar authorization', error)
    return noStoreText('Calendar connection is unavailable', {
      status: HTTP_SERVICE_UNAVAILABLE,
    })
  }
}
