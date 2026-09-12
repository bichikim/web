import type {Accessor} from 'solid-js'
import type {PreviewPlayback} from './preview-playback'
import type {PTrack, RepeatMode} from '../../features/focus-room-audio'

/** 현재 위치와 전체 길이. 시간 단위는 초다. */
export interface MediaPlayerTime {
  readonly currentTime: number
  readonly duration: number
}

/** 음량은 0~1이며 음소거 여부는 별도로 전달한다. */
export interface MediaPlayerVolume {
  readonly volume: number
  readonly muted: boolean
}

export interface MediaPlayerOptions {
  readonly tracks?: readonly PTrack[]
  readonly stopOnUnmount?: boolean
  readonly isDialogueActive?: boolean
  readonly onTrackChange?: (track: PTrack | null) => void
  readonly onPlayingChange?: (isPlaying: boolean) => void
  readonly onTimeUpdate?: (time: MediaPlayerTime) => void
  readonly onDurationChange?: (duration: number) => void
  readonly onVolumeChange?: (volume: MediaPlayerVolume) => void
  readonly onEnded?: (track: PTrack | null) => void
  readonly onError?: (error: unknown) => void
}

export interface SelectTrackOptions {
  readonly index: number
  readonly shouldResume?: boolean
}

export interface SelectRandomTrackOptions {
  readonly shouldResume?: boolean
}

export interface PlayerState {
  readonly tracks: Accessor<readonly PTrack[]>
  readonly currentIndex: Accessor<number>
  readonly currentTrack: Accessor<PTrack | undefined>
  readonly isPlaying: Accessor<boolean>
  readonly levels: Accessor<readonly number[]>
  readonly repeatMode: Accessor<RepeatMode>
  readonly shuffleEnabled: Accessor<boolean>
  readonly canEditQueue: Accessor<boolean>
  readonly addTracksToQueue: (tracks: readonly PTrack[]) => void
  readonly removeTrackFromQueue: (index: number) => void
  readonly clearTrackQueue: () => void
  readonly selectChosenTrack: (index: number) => void
  readonly selectNextTrack: () => void
  readonly selectPreviousTrack: () => void
  readonly toggleRepeatMode: (mode: Exclude<RepeatMode, 'none'>) => void
  readonly toggleShuffle: () => void
  readonly previewPlayback: PreviewPlayback
}
