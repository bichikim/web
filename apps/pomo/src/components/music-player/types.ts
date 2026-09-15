import type {MediaPlayerOptions} from '../media-player/types'
import type {PSceneStyle} from '../../features/focus-room-animation'

export interface PMusicPlayerContentProps extends MediaPlayerOptions {
  readonly backdropBlur?: boolean
  readonly expanded?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  readonly sceneStyle?: PSceneStyle
}
