import {clientOnly} from '@solidjs/start'

const FocusRoomFeedSettingsClient = clientOnly(() => import('./FocusRoomFeedSettings.client'), {
  lazy: true,
})

export const FocusRoomFeedSettings = () => <FocusRoomFeedSettingsClient />
