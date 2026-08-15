import {clientOnly} from '@solidjs/start'

import type {PTrack} from '../features/focus-room-audio/focus-room-playlist'

const PMusicPlayerContent = clientOnly(() => import('./PMusicPlayerContent'), {
  lazy: true,
})

export interface PMusicPlayerProps {
  readonly expanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  readonly onTrackChange?: (track: PTrack | null) => void
}

export const PMusicPlayer = (props: PMusicPlayerProps) => (
  <PMusicPlayerContent
    expanded={props.expanded}
    onExpandedChange={(expanded) => props.onExpandedChange?.(expanded)}
    onTrackChange={(track) => props.onTrackChange?.(track)}
  />
)
