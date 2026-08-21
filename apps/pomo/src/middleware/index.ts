import {createMiddleware} from '@solidjs/start/middleware'

import {corsMiddleware} from './cors'

export default createMiddleware([corsMiddleware])
