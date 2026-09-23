import {clientOnly} from '@solidjs/start'

export const PLayerReviewViewport = clientOnly(
  async () => {
    const {PLayerReviewCanvas} = await import('./Canvas')
    return {default: PLayerReviewCanvas}
  },
  {
    lazy: true,
  },
)
