import {clientOnly} from '@solidjs/start'

export const PAiSettingsPanel = clientOnly(
  async () => {
    const {PAiSettingsContent} = await import('./Content')
    return {default: PAiSettingsContent}
  },
  {lazy: true},
)
