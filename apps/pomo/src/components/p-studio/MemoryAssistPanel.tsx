import {clientOnly} from '@solidjs/start'

export const MemoryAssistPanel = clientOnly(() => import('../PMemoryAssist'), {lazy: true})
