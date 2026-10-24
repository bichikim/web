import {createMiddleware} from '@solidjs/start/middleware'
import {DOCUMENT_MIDDLEWARE} from './document'
import {handleRelaxRequest} from './relax-routing'

export default createMiddleware([
  ...DOCUMENT_MIDDLEWARE,
  (event, next) => handleRelaxRequest(event.req) ?? next(),
])
