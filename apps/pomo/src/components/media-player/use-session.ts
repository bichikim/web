import {type Accessor, createEffect, onCleanup} from 'solid-js'

export interface PlayerMetadata {
  readonly title: string
  readonly artist?: string
  readonly artworkUrl?: string
}

interface UsePlayerMediaSessionProps {
  readonly currentTrack: Accessor<PlayerMetadata | undefined>
  readonly isPlaying: Accessor<boolean>
  readonly onNextTrack: () => void
  readonly onPause: () => void
  readonly onPlay: () => void
  readonly onPreviousTrack: () => void
}

const getMediaSession = (): MediaSession | undefined => {
  const {navigator} = globalThis
  if (typeof navigator === 'undefined') {
    return undefined
  }
  return navigator.mediaSession
}

const setActionHandler = (
  mediaSession: MediaSession,
  action: MediaSessionAction,
  handler: MediaSessionActionHandler | null,
) => {
  try {
    mediaSession.setActionHandler(action, handler)
  } catch {
    // Browsers may expose Media Session while omitting individual actions.
  }
}

/** Synchronizes playback metadata and transport actions with device media controls. */
export const usePlayerMediaSession = (props: UsePlayerMediaSessionProps): void => {
  const mediaSession = getMediaSession()

  if (mediaSession === undefined) {
    return
  }

  createEffect(() => {
    const track = props.currentTrack()
    mediaSession.playbackState =
      track === undefined ? 'none' : props.isPlaying() ? 'playing' : 'paused'

    if (track === undefined || typeof MediaMetadata === 'undefined') {
      mediaSession.metadata = null
      return
    }

    const {artworkUrl} = track
    mediaSession.metadata = new MediaMetadata({
      artist: track.artist,
      artwork: artworkUrl === undefined ? [] : [{src: artworkUrl}],
      title: track.title,
    })
  })

  setActionHandler(mediaSession, 'nexttrack', () => props.onNextTrack())
  setActionHandler(mediaSession, 'pause', () => props.onPause())
  setActionHandler(mediaSession, 'play', () => props.onPlay())
  setActionHandler(mediaSession, 'previoustrack', () => props.onPreviousTrack())

  onCleanup(() => {
    mediaSession.metadata = null
    mediaSession.playbackState = 'none'

    setActionHandler(mediaSession, 'nexttrack', null)
    setActionHandler(mediaSession, 'pause', null)
    setActionHandler(mediaSession, 'play', null)
    setActionHandler(mediaSession, 'previoustrack', null)
  })
}
