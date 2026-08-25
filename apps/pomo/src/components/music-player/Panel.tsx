import {clientOnly} from '@solidjs/start'

export const PMusicPlayerPanel = clientOnly(() => import('./Content'), {
  lazy: true,
})
