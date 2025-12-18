import {createMiddlewareFragment} from 'src/utils/middleware-helper'
import {TRUSTED_ORIGINS} from 'src/middleware/consts'
import {json} from '@solidjs/router'

export const corsMiddleware = createMiddlewareFragment({
  onBeforeResponse: (event) => {
    const {request, response} = event

    response.headers.append('Vary', 'Origin, Access-Control-Request-Method')

    const origin = request.headers.get('Origin')
    const requestUrl = new URL(request.url)

    // api path only
    const isApiRequest = requestUrl && requestUrl.pathname.startsWith('/api')

    if (isApiRequest && origin && TRUSTED_ORIGINS.includes(origin)) {
      // Handle preflight requests.
      if (request.method === 'OPTIONS' && request.headers.get('Access-Control-Request-Method')) {
        // Preflight requests are standalone, so we immediately send a response.
        return json(null, {
          headers: {
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Allow-Methods': 'OPTIONS, POST, PUT, PATCH, DELETE',
            'Access-Control-Allow-Origin': origin,
          },
        })
      }

      // Handle normal requests.
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
  },
})
