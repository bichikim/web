import {clientOnly} from '@solidjs/start'

export const PMusicPlayerPanel = clientOnly(
  async () => {
    const {PMusicPlayerContent} = await import('./Content')
    return {default: PMusicPlayerContent}
  },
  {
    lazy: true,
  },
)
