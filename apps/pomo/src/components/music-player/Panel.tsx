import {clientOnly} from '@solidjs/start'

export const PMusicPlayerPanel = clientOnly(() => import('../PMusicPlayerContent'), {
  lazy: true,
})
