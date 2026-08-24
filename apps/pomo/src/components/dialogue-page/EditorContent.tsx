import {clientOnly} from '@solidjs/start'

export const DialogueEditorContent = clientOnly(() => import('../PDialogueEditor'), {
  lazy: true,
})
