import {createMiddleware} from '@solidjs/start/middleware'
import {getSession as _getSession} from '@auth/solid-start'
import {authOptions} from 'src/server/auth/config'

// uses via vite.config.mts -> middleware: 'src/middleware/index.ts'
export default createMiddleware({
  onRequest: (event) => {
    event.locals.session = _getSession(event.request, authOptions)
  },
})
