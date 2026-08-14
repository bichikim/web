import {clientOnly} from '@solidjs/start'

const FocusRoomDialogueSettingsContent = clientOnly(
  () => import('./FocusRoomDialogueSettingsContent'),
  {lazy: true},
)

export const FocusRoomDialogueSettings = () => <FocusRoomDialogueSettingsContent />
