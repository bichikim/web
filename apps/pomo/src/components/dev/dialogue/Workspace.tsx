import {clientOnly} from '@solidjs/start'

export const DialogueWorkspace = clientOnly(
  async () => {
    const {DialogueWriter} = await import('src/components/DialogueWriter')
    return {default: DialogueWriter}
  },
  {
    lazy: true,
  },
)
