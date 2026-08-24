import {clientOnly} from '@solidjs/start'

export const PLayerReviewViewport = clientOnly(() => import('../PLayerReviewCanvas'), {
  lazy: true,
})
