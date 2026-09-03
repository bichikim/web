import {clientOnly} from '@solidjs/start'

export const VersionNoticePanel = clientOnly(() => import('../PVersionNotice'), {lazy: true})
