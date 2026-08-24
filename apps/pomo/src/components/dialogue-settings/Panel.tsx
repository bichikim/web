import {clientOnly} from '@solidjs/start'

export const PDialogueSettingsPanel = clientOnly(() => import('../PDialogueSettingsContent'), {
  lazy: true,
})
