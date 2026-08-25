import {type Accessor, createEffect, onCleanup, onMount} from 'solid-js'

import type {PTrack} from './focus-room-playlist'

interface UsePlayerMediaSessionProps {
  readonly currentTrack: Accessor<PTrack | undefined>
  readonly isPlaying: Accessor<boolean>
  readonly onNextTrack: () => void
  readonly onPause: () => void
  readonly onPlay: () => void
  readonly onPreviousTrack: () => void
}

const getMediaSession = (): MediaSession | undefined =>
  'mediaSession' in navigator ? navigator.mediaSession : undefined

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

/** Synchronizes Pomo playback metadata and transport actions with device media controls. */
export const usePlayerMediaSession = (props: UsePlayerMediaSessionProps): void => {
  onMount(() => {
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

      mediaSession.metadata = new MediaMetadata({
        artist: track.artist,
        artwork: track.artworkUrl === undefined ? [] : [{src: track.artworkUrl}],
        title: track.title,
      })
    })

    const handlers = [
      ['nexttrack', () => props.onNextTrack()],
      ['pause', () => props.onPause()],
      ['play', () => props.onPlay()],
      ['previoustrack', () => props.onPreviousTrack()],
    ] as const satisfies ReadonlyArray<readonly [MediaSessionAction, MediaSessionActionHandler]>

    for (const [action, handler] of handlers) {
      setActionHandler(mediaSession, action, handler)
    }

    onCleanup(() => {
      mediaSession.metadata = null
      mediaSession.playbackState = 'none'

      for (const [action] of handlers) {
        setActionHandler(mediaSession, action, null)
      }
    })
  })
}
