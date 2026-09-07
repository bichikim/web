import {createMiddleware} from '@solidjs/start/middleware'

import {corsMiddleware} from '../../../../src/middleware/cors'

export default createMiddleware([corsMiddleware])
