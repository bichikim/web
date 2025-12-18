import {createMiddleware} from '@solidjs/start/middleware'
import {mergeMiddleware} from 'src/utils/middleware-helper'
import {cspMiddleware} from 'src/middleware/csp'
import {csrfMiddleware} from 'src/middleware/csrf'

export default createMiddleware(mergeMiddleware(cspMiddleware, csrfMiddleware))
