import {type PPlaybackState, type PTrack, resolvePPlaylist} from '../../features/focus-room-audio'

export interface RestorePPlayerStateOptions {
  readonly canRestore: () => boolean
  readonly defaultTracks: readonly PTrack[]
  readonly onRestore: (tracks: readonly PTrack[], playback: PPlaybackState | null) => void
  readonly playbackRequest: Promise<PPlaybackState | null>
  readonly playlistRequest: Promise<readonly string[] | null>
  readonly tracks: readonly PTrack[]
}

/** Restores playlist and playback state independently as their runtime stores settle. */
export const restorePPlayerState = async (options: RestorePPlayerStateOptions): Promise<void> => {
  let playlistResolved = false
  let playbackApplied = false
  let restoredTracks = options.defaultTracks
  let storedPlayback: PPlaybackState | null = null
  const restorePlayback = options.playbackRequest.then((playback) => {
    storedPlayback = playback
    const trackIsAvailable = restoredTracks.some((track) => track.id === playback?.trackId)

    if (playback !== null && (playlistResolved || trackIsAvailable) && options.canRestore()) {
      options.onRestore(restoredTracks, playback)
      playbackApplied = true
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

    const shouldRestore = storedTrackIds !== null || (storedPlayback !== null && !playbackApplied)

    if (shouldRestore && options.canRestore()) {
      options.onRestore(restoredTracks, storedPlayback)
    }
  })

  await Promise.all([restorePlayback, restorePlaylist])
}
