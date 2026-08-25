import {clientOnly} from '@solidjs/start'

export const PLayerReviewViewport = clientOnly(() => import('./Canvas'), {
  lazy: true,
})
