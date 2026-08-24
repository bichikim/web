import {clientOnly} from '@solidjs/start'

export const DialogueWorkspace = clientOnly(() => import('src/components/DialogueWriter'), {
  lazy: true,
})
