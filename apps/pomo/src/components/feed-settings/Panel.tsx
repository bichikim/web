import {clientOnly} from '@solidjs/start'

export const PFeedSettingsPanel = clientOnly(
  async () => {
    const {PFeedSettingsContent} = await import('./Content')
    return {default: PFeedSettingsContent}
  },
  {
    lazy: true,
  },
)
