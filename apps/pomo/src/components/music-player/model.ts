import type {PTrack} from '../../features/focus-room-audio'
import type {PSceneStyle} from '../../features/focus-room-animation'

export interface PMusicPlayerContentProps {
  readonly expanded?: boolean
  readonly isDialogueActive?: boolean
  readonly onExpandedChange?: (expanded: boolean) => void
  readonly onPlayingChange?: (isPlaying: boolean) => void
  readonly onTrackChange?: (track: PTrack | null) => void
  readonly sceneStyle?: PSceneStyle
  readonly tracks?: readonly PTrack[]
}

export interface SelectTrackOptions {
  readonly index: number
  readonly shouldResume?: boolean
}

export interface SelectRandomTrackOptions {
  readonly shouldResume?: boolean
}

export const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError'
