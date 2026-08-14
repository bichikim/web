import {clientOnly} from '@solidjs/start'

const FocusRoomMusicPlayerClient = clientOnly(() => import('./FocusRoomMusicPlayer.client'), {
  lazy: true,
})

export interface FocusRoomMusicPlayerProps {
  readonly expanded: boolean
  readonly onExpandedChange: (expanded: boolean) => void
}

export const FocusRoomMusicPlayer = (props: FocusRoomMusicPlayerProps) => (
  <FocusRoomMusicPlayerClient
    expanded={props.expanded}
    onExpandedChange={(expanded) => props.onExpandedChange(expanded)}
  />
)
