import {createMiddleware} from '@solidjs/start/middleware'

import {paraglideMiddleware} from '@paraglide/server'
import {handleAdminAuthRequest} from './admin-auth'
import {corsMiddleware} from './cors'
import {handleLegacyRedirectRequest} from './legacy-redirect'
import {securityHeadersMiddleware} from './security-headers'
import {handleUserAuthRequest} from './user-auth'

export default createMiddleware([
  securityHeadersMiddleware,
  corsMiddleware,
  (event, next) => paraglideMiddleware(event.req, () => next()),
  async (event, next) => {
    if (!(import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true')) {
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
