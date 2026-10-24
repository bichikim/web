import {clientOnly} from '@solidjs/start'

export const CharacterViewportCanvas = clientOnly(
  async () => {
    const {CharacterCanvas} = await import('./Canvas')
    return {default: CharacterCanvas}
  },
  {lazy: true},
)
