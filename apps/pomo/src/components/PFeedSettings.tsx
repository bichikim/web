import {clientOnly} from '@solidjs/start'

const PFeedSettingsContent = clientOnly(() => import('./PFeedSettingsContent'), {
  lazy: true,
})

export const PFeedSettings = () => <PFeedSettingsContent />
