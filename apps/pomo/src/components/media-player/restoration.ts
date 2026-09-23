import {type PPlaybackState, type PTrack, resolvePPlaylist} from '../../features/focus-room-audio'

export interface RestorePPlayerStateOptions {
  readonly canRestore: () => boolean
  readonly defaultTracks: readonly PTrack[]
  readonly onRestore: (tracks: readonly PTrack[], playback: PPlaybackState | null) => void
  readonly playbackRequest: Promise<PPlaybackState | null>
  readonly playlistRequest: Promise<readonly string[] | null>
  readonly tracks: readonly PTrack[]
}

/** Restores the playlist as it settles and applies playback only to the resolved queue. */
export const restorePPlayerState = async (options: RestorePPlayerStateOptions): Promise<void> => {
  let playlistResolved = false
  let restoredTracks = options.defaultTracks
  let storedPlayback: PPlaybackState | null = null
  const restorePlayback = options.playbackRequest.then((playback) => {
    storedPlayback = playback

    if (playback !== null && playlistResolved && options.canRestore()) {
      options.onRestore(restoredTracks, playback)
    }
  })
  const restorePlaylist = options.playlistRequest.then((storedTrackIds) => {
    playlistResolved = true

    if (storedTrackIds !== null) {
      restoredTracks = resolvePPlaylist({
        defaultTracks: options.defaultTracks,
        storedTrackIds,
        tracks: options.tracks,
      })
    }

    const shouldRestore = storedTrackIds !== null || storedPlayback !== null

    if (shouldRestore && options.canRestore()) {
      options.onRestore(restoredTracks, storedPlayback)
    }
  })

  await Promise.all([restorePlayback, restorePlaylist])
}
