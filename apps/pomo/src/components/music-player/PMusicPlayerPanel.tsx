import {clientOnly} from '@solidjs/start'

export const PMusicPlayerPanel = clientOnly(
  async () => {
    const {PMusicPlayerContent} = await import('./PMusicPlayerContent')
    return {default: PMusicPlayerContent}
  },
  {
    lazy: true,
  },
)
