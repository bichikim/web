import {clientOnly} from '@solidjs/start'

import type {FocusRoomTrack} from '../features/focus-room-audio/focus-room-playlist'

const FocusRoomMusicPlayerClient = clientOnly(() => import('./FocusRoomMusicPlayer.client'), {
  lazy: true,
})

export interface FocusRoomMusicPlayerProps {
  readonly expanded: boolean
  readonly onExpandedChange: (expanded: boolean) => void
  readonly onTrackChange?: (track: FocusRoomTrack | null) => void
}

export const FocusRoomMusicPlayer = (props: FocusRoomMusicPlayerProps) => (
  <FocusRoomMusicPlayerClient
    expanded={props.expanded}
    onExpandedChange={(expanded) => props.onExpandedChange(expanded)}
    onTrackChange={(track) => props.onTrackChange?.(track)}
  />
)
