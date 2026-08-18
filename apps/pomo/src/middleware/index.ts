import {createMiddleware} from '@solidjs/start/middleware'

import {applyCorsPreflightHeaders, applyCorsResponseHeaders} from './cors.ts'

export default createMiddleware([
  async (event, next) => {
    const origin = event.req.headers.get('Origin')
    const isAllowed = applyCorsResponseHeaders(event.res.headers, origin, event.url.origin)
    const isPreflight =
      event.req.method === 'OPTIONS' && event.req.headers.has('Access-Control-Request-Method')

    if (isAllowed && isPreflight) {
      applyCorsPreflightHeaders(event.res.headers)

      return new Response(null, {headers: event.res.headers, status: 204})
    }

    return next()
  },
])
