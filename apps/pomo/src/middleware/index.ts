import {createMiddleware} from '@solidjs/start/middleware'

import {handleAdminAuthRequest} from './admin-auth'
import {handleLegacyRedirectRequest} from './legacy-redirect'
import {DOCUMENT_MIDDLEWARE} from './document'
import {handleUserAuthRequest} from './user-auth'

export default createMiddleware([
  ...DOCUMENT_MIDDLEWARE,
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
