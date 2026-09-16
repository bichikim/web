import type {PPlaybackState} from '../../features/focus-room-audio'

export interface TrackLoadTransition {
  readonly phase: 'loading' | 'awaiting-metadata'
  readonly pauseProtected: true
  readonly trackId: string
}

export interface PlaybackRestoreTransition {
  readonly phase: 'restoring'
  readonly playback: PPlaybackState
  readonly seekPending: boolean
  readonly pauseProtected: boolean
}

export type PlaybackTransition = TrackLoadTransition | PlaybackRestoreTransition

export const getCurrentPlaybackTransition = (
  transition: PlaybackTransition | null,
  trackId: string | undefined,
) => {
  if (transition === null) {
    return null
  }

  const transitionTrackId =
    transition.phase === 'restoring' ? transition.playback.trackId : transition.trackId
  return transitionTrackId === trackId ? transition : null
}

export interface PersistRestoredPlaybackOptions {
  readonly element: HTMLAudioElement | undefined
  readonly trackId: string | undefined
  readonly transition: PlaybackTransition | null
  readonly writePlayback: (state: PPlaybackState) => void
}

export const readPlaybackPosition = (element: HTMLAudioElement | undefined) => {
  const positionSeconds = element?.currentTime
  return positionSeconds !== undefined && Number.isFinite(positionSeconds)
    ? Math.max(0, positionSeconds)
    : null
}

export const persistRestoredPlayback = (options: PersistRestoredPlaybackOptions) => {
  const {transition} = options
  if (transition?.phase !== 'restoring') {
    return false
  }
  if (transition.playback.trackId !== options.trackId) {
    return false
  }

  const positionSeconds = readPlaybackPosition(options.element)
  if (transition.seekPending && positionSeconds === transition.playback.positionSeconds) {
    return true
  }

  if (!transition.playback.isPlaying || positionSeconds === null) {
    return false
  }

  options.writePlayback({...transition.playback, positionSeconds})
  return true
}
