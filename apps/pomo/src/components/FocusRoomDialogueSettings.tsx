import {clientOnly} from '@solidjs/start'

const FocusRoomDialogueSettingsClient = clientOnly(
  () => import('./FocusRoomDialogueSettings.client'),
  {lazy: true},
)

export const FocusRoomDialogueSettings = () => <FocusRoomDialogueSettingsClient />
