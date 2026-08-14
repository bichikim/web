import {clientOnly} from '@solidjs/start'

const FocusRoomMusicPlayerContent = clientOnly(() => import('./FocusRoomMusicPlayerContent'), {
  lazy: true,
})

export interface FocusRoomMusicPlayerProps {
  readonly expanded: boolean
  readonly onExpandedChange: (expanded: boolean) => void
}

export const FocusRoomMusicPlayer = (props: FocusRoomMusicPlayerProps) => (
  <FocusRoomMusicPlayerContent
    expanded={props.expanded}
    onExpandedChange={(expanded) => props.onExpandedChange(expanded)}
  />
)
