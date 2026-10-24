import {clientOnly} from '@solidjs/start'

export const Player = clientOnly(
  async () => {
    const {Canvas} = await import('./Canvas')
    return {default: Canvas}
  },
  {lazy: true},
)
