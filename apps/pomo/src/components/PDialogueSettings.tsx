import {clientOnly} from '@solidjs/start'

const PDialogueSettingsContent = clientOnly(() => import('./PDialogueSettingsContent'), {
  lazy: true,
})

export const PDialogueSettings = () => <PDialogueSettingsContent />
