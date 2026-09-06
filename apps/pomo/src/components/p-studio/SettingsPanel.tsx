import {clientOnly} from '@solidjs/start'

export const SceneSettingsPanel = clientOnly(
  async () => {
    const {PSettings} = await import('../PSettings')
    return {default: PSettings}
  },
  {lazy: true},
)
