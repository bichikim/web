import {clientOnly} from '@solidjs/start'

export const GenerationWorkspace = clientOnly(
  async () => {
    const {Generation} = await import('./Generation')
    return {default: Generation}
  },
  {lazy: true},
)
