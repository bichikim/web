import {clientOnly} from '@solidjs/start'

export const PDialogueSettingsPanel = clientOnly(() => import('./Content'), {
  lazy: true,
})
