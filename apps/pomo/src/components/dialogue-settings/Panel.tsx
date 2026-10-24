import {clientOnly} from '@solidjs/start'

export const PDialogueSettingsPanel = clientOnly(
  async () => {
    const {PDialogueSettingsContent} = await import('./Content')
    return {default: PDialogueSettingsContent}
  },
  {
    lazy: true,
  },
)
