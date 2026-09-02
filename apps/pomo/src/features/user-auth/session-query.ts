import {query} from '@solidjs/router'

import {readAccountSession} from './web-session'

export const accountSessionQuery = query(readAccountSession, 'user-account-session')
