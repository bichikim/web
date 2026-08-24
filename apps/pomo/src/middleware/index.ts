import {createMiddleware} from '@solidjs/start/middleware'

import {handleAdminAuthRequest} from './admin-auth.ts'
import {corsMiddleware} from './cors.ts'
import {handleLegacyRedirectRequest} from './legacy-redirect.ts'
import {securityHeadersMiddleware} from './security-headers.ts'
import {handleUserAuthRequest} from './user-auth.ts'

export default createMiddleware([
  securityHeadersMiddleware,
  corsMiddleware,
  async (event, next) => {
    if (!import.meta.env.POMO_IS_APPS_IN_TOSS) {
      const legacyRedirect = handleLegacyRedirectRequest(event.req)

      if (legacyRedirect !== null) {
        return legacyRedirect
      }
    }

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
