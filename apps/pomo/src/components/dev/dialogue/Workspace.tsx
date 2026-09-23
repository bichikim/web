import {clientOnly} from '@solidjs/start'

export const DialogueWorkspace = clientOnly(
  async () => {
    const {DialogueWriter} = await import('src/components/dialogue-writer/DialogueWriter')
    return {default: DialogueWriter}
  },
  {
    lazy: true,
  },
)
