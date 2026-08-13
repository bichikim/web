import {clientOnly} from '@solidjs/start'

const FocusRoomMusicPlayerClient = clientOnly(() => import('./FocusRoomMusicPlayer.client'), {
  lazy: true,
})

export interface FocusRoomMusicPlayerProps {
  readonly isHidden?: boolean
}

export const FocusRoomMusicPlayer = (props: FocusRoomMusicPlayerProps) => (
  <div hidden={props.isHidden}>
    <FocusRoomMusicPlayerClient />
  </div>
)
