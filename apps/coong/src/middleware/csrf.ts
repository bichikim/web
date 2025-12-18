import {createMiddlewareFragment} from 'src/utils/middleware-helper'
import {json} from '@solidjs/router'

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS', 'TRACE']
const TRUSTED_ORIGINS = ['http://localhost:3000', 'https://coong.io']

/**
 * CSRF middleware to protect against CSRF attacks.
 * @see https://docs.solidjs.com/solid-start/guides/security#csrf-cross-site-request-forgery
 * @param event - The event object.
 * @returns The event object.
 */
export const csrfMiddleware = createMiddlewareFragment({
  onRequest: async (event) => {
    const {request, response} = event

    // If the request method is safe, skip the CSRF check.
    if (SAFE_METHODS.includes(request.method)) {
      return
    }

    const requestUrl = new URL(request.url)
    const origin = request.headers.get('Origin')

    // If we have an Origin header, check it against our allowlist.
    if (origin) {
      const parsedOrigin = new URL(origin)

      if (parsedOrigin.origin === requestUrl.origin || TRUSTED_ORIGINS.includes(parsedOrigin.origin)) {
        return
      }

      return json({error: 'Unauthorized'}, {status: 403})
    }

    // If we are serving via TLS and have no Origin header, prevent against
    // CSRF via HTTP man-in-the-middle attacks by enforcing strict Referer
    // origin checks.
    if (!origin && requestUrl.protocol === 'https:') {
      const referer = request.headers.get('Referer')

      if (!referer) {
        return json({error: 'Unauthorized'}, {status: 403})
      }

      const parsedReferer = new URL(referer)

      if (parsedReferer.protocol !== 'https:') {
        return json({error: 'Unauthorized'}, {status: 403})
      }

      if (parsedReferer.origin !== requestUrl.host && !TRUSTED_ORIGINS.includes(parsedReferer.origin)) {
        return json({error: 'Unauthorized'}, {status: 403})
      }
    }
  },
})
