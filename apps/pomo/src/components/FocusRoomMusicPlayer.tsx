import {clientOnly} from '@solidjs/start'

const FocusRoomMusicPlayerClient = clientOnly(() => import('./FocusRoomMusicPlayer.client'), {
  lazy: true,
})

export const FocusRoomMusicPlayer = () => <FocusRoomMusicPlayerClient />
