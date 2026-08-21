import {createMiddleware} from '@solidjs/start/middleware'

import {handleAdminAuthRequest} from './admin-auth.ts'
import {corsMiddleware} from './cors.ts'
import {handleUserAuthRequest} from './user-auth.ts'

export default createMiddleware([
  corsMiddleware,
  async (event, next) => {
    const userAuthResponse = await handleUserAuthRequest({
      request: event.req,
      responseHeaders: event.res.headers,
      url: event.url,
    })

    if (userAuthResponse !== null) {
      return userAuthResponse
    }

    const authResponse = await handleAdminAuthRequest({
      request: event.req,
      responseHeaders: event.res.headers,
      url: event.url,
    })

    if (authResponse !== null) {
      return authResponse
    }

    return next()
  },
])
