import {createMiddleware} from '@solidjs/start/middleware'

import {corsMiddleware} from './cors.ts'

export default createMiddleware([corsMiddleware])
