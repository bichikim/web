import {clientOnly} from '@solidjs/start'

export const PFeedSettingsPanel = clientOnly(() => import('./Content'), {
  lazy: true,
})
