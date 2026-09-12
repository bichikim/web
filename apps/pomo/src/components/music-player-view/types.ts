import type {PSceneStyle} from '../../features/focus-room-animation'
import type {PTrack, RepeatMode} from '../../features/focus-room-audio'

export interface MusicPlayerViewProps {
  readonly currentIndex: number
  readonly currentTrack?: PTrack
  readonly expanded: boolean
  readonly isPlaying: boolean
  readonly levels: readonly number[]
  readonly onAlbumAdd?: (tracks: readonly PTrack[]) => void
  readonly onAlbumClear?: () => void
  readonly onExpandedChange: () => void
  readonly onNextTrack: () => void
  readonly onPreviousTrack: () => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly onRepeatModeChange: (mode: Exclude<RepeatMode, 'none'>) => void
  readonly onShuffleChange: () => void
  readonly onTrackRemove?: (index: number) => void
  readonly onTrackSelect: (index: number) => void
  readonly repeatMode: RepeatMode
  readonly sceneStyle?: PSceneStyle
  readonly shuffleEnabled: boolean
  readonly tracks: readonly PTrack[]
}
