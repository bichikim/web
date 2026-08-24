import {clientOnly} from '@solidjs/start'

export const PFeedSettingsPanel = clientOnly(() => import('../PFeedSettingsContent'), {
  lazy: true,
})
