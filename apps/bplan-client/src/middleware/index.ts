import {createMiddleware} from '@solidjs/start/middleware'
import {getSession as _getSession} from '@auth/solid-start'
import {authOptions} from 'src/server/auth/config'

export default createMiddleware({
  onRequest: (event) => {
    event.locals.session = _getSession(event.request, authOptions)
  },
})
