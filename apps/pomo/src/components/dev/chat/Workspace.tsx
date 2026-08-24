import {clientOnly} from '@solidjs/start'

export const ChatWorkspace = clientOnly(() => import('src/components/ChatRoom'), {lazy: true})
