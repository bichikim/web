import {SERVER_AI_RELEASED} from '../features/ai-job/release'
import {createMiddleware} from '@solidjs/start/middleware'

import {handleAdminAuthRequest} from './admin-auth'
import {authenticationMiddleware} from './authentication'
import {handleLegacyRedirectRequest} from './legacy-redirect'
import {DOCUMENT_MIDDLEWARE} from './document'
import {handleUserAuthRequest} from './user-auth'

export default createMiddleware([
  ...DOCUMENT_MIDDLEWARE,
  authenticationMiddleware,
  async (event, next) => {
    // 출시 전 API 직접 호출과 기존 cron 호출도 차단한다. 인증 조회/DB/provider에 도달하지 않는다.
    let pathname: string
    try {
      pathname = decodeURIComponent(event.url.pathname).replace(/\/+/gu, '/').replace(/\/$/u, '')
    } catch {
      return new Response(null, {status: 400})
    }
    if (
      !SERVER_AI_RELEASED &&
      (pathname === '/api/ai' ||
        pathname.startsWith('/api/ai/') ||
        pathname === '/api/cron/ai-jobs')
    ) {
      return new Response(null, {headers: {'Cache-Control': 'no-store'}, status: 404})
    }

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
