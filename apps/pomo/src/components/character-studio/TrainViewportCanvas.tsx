import {clientOnly} from '@solidjs/start'

export const TrainViewportCanvas = clientOnly(
  async () => {
    const {TrainCanvas} = await import('./TrainCanvas')
    return {default: TrainCanvas}
  },
  {lazy: true},
)
