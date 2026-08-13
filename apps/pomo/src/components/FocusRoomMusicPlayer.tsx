import {clientOnly} from '@solidjs/start'

const FocusRoomMusicPlayerClient = clientOnly(() => import('./FocusRoomMusicPlayer.client'), {
  lazy: true,
})

export interface FocusRoomMusicPlayerProps {
  readonly expanded: boolean
  readonly isHidden?: boolean
  readonly onExpandedChange: (expanded: boolean) => void
}

export const FocusRoomMusicPlayer = (props: FocusRoomMusicPlayerProps) => (
  <div class="contents" hidden={props.isHidden}>
    <FocusRoomMusicPlayerClient
      expanded={props.expanded}
      onExpandedChange={(expanded) => props.onExpandedChange(expanded)}
    />
  </div>
)
