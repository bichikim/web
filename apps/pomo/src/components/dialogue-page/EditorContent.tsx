import {clientOnly} from '@solidjs/start'

export const DialogueEditorContent = clientOnly(
  async () => {
    const {PDialogueEditor} = await import('./Editor')
    return {default: PDialogueEditor}
  },
  {
    lazy: true,
  },
)
