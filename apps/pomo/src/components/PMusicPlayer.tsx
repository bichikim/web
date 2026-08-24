import type {PTrack} from '../features/focus-room-audio'
import type {PSceneStyle} from '../features/focus-room-animation'
import {PMusicPlayerPanel} from './music-player/Panel'

export interface PMusicPlayerProps {
  readonly expanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  readonly onTrackChange?: (track: PTrack | null) => void
  readonly sceneStyle?: PSceneStyle
}

export const PMusicPlayer = (props: PMusicPlayerProps) => (
  <PMusicPlayerPanel
    expanded={props.expanded}
    onExpandedChange={(expanded) => props.onExpandedChange?.(expanded)}
    onTrackChange={(track) => props.onTrackChange?.(track)}
    sceneStyle={props.sceneStyle}
  />
)
