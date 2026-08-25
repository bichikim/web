import {clientOnly} from '@solidjs/start'

export const DialogueEditorContent = clientOnly(() => import('./Editor'), {
  lazy: true,
})
