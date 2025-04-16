import {createMiddleware} from '@solidjs/start/middleware'
import {getSession} from '@auth/solid-start'
import {authOptions} from 'src/server/auth/config'

/**
 * set session to event.locals on request
 * uses via vite.config.mts -> middleware: 'src/middleware/index.ts'
 */
export default createMiddleware({
  onRequest: (event) => {
    // skip trpc request
    // trpc take a session from context
    if (event.request.url.includes('/api/trpc')) {
      return
    }

    // insert session to locals from auth/solid-start
    event.locals.session = getSession(event.request, authOptions)
  },
})
