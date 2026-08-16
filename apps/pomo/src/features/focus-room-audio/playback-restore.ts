import type {PTrack} from './focus-room-playlist'
import type {PPlaybackState} from './playback-storage'

export interface ResolvePlaybackRestoreOptions {
  readonly fallbackIndex: number
  readonly storedPlayback: PPlaybackState | null
  readonly tracks: readonly PTrack[]
}

export interface PlaybackRestore {
  readonly currentIndex: number
  readonly playback: PPlaybackState | null
  readonly shouldPersist: boolean
}

export const resolvePlaybackRestore = (options: ResolvePlaybackRestoreOptions): PlaybackRestore => {
  const trackCount = options.tracks.length

  if (trackCount === 0) {
    return {currentIndex: 0, playback: null, shouldPersist: false}
  }

  if (options.storedPlayback === null) {
    const currentIndex = (options.fallbackIndex + trackCount) % trackCount
    return {currentIndex, playback: null, shouldPersist: false}
  }

  const storedIndex = options.tracks.findIndex(
    (track) => track.id === options.storedPlayback?.trackId,
  )

  if (storedIndex >= 0) {
    return {currentIndex: storedIndex, playback: options.storedPlayback, shouldPersist: false}
  }

  return {
    currentIndex: 0,
    playback: {isPlaying: false, positionSeconds: 0, trackId: options.tracks[0].id},
    shouldPersist: true,
  }
}
