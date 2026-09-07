import {clientOnly} from '@solidjs/start'

export const MemoryAssistPanel = clientOnly(
  async () => {
    const {PMemoryAssist} = await import('../PMemoryAssist')
    return {default: PMemoryAssist}
  },
  {lazy: true},
)
