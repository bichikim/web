import type {MediaPlayerOptions} from '../media-player/types'
import type {PSceneStyle} from '../../features/focus-room-animation'

export interface MusicPlaybackActions {
  readonly pause: () => void
  readonly play: () => void
}

export interface PMusicPlayerContentProps extends MediaPlayerOptions {
  readonly backdropBlur?: boolean
  readonly expanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  readonly onPlaybackActionsReady?: (actions: MusicPlaybackActions | null) => void
  readonly sceneStyle?: PSceneStyle
}
