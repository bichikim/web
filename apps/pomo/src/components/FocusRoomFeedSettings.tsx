import {clientOnly} from '@solidjs/start'

const FocusRoomFeedSettingsContent = clientOnly(() => import('./FocusRoomFeedSettingsContent'), {
  lazy: true,
})

export const FocusRoomFeedSettings = () => <FocusRoomFeedSettingsContent />
