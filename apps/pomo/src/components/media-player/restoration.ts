import {type PPlaybackState, type PTrack, resolvePPlaylist} from '../../features/focus-room-audio'

export interface RestorePPlayerStateOptions {
  readonly canRestore: () => boolean
  readonly defaultTracks: readonly PTrack[]
  readonly onRestore: (tracks: readonly PTrack[], playback: PPlaybackState | null) => void
  readonly playbackRequest: Promise<PPlaybackState | null>
  readonly playlistRequest: Promise<readonly string[] | null>
  readonly resolveTracks?: (storedTrackIds: readonly string[]) => Promise<readonly PTrack[]>
  readonly tracks: readonly PTrack[]
}

/** Restores the saved playlist and playback state after both requests settle. */
export const restorePPlayerState = async (options: RestorePPlayerStateOptions): Promise<void> => {
  const [storedTrackIds, storedPlayback] = await Promise.all([
    options.playlistRequest,
    options.playbackRequest,
  ])

  if (storedTrackIds === null && storedPlayback === null) {
    return
  }

  if (!options.canRestore()) {
    return
  }

  const restoredTracks =
    storedTrackIds === null
      ? options.defaultTracks
      : resolvePPlaylist({
          defaultTracks: options.defaultTracks,
          storedTrackIds,
          tracks:
            options.resolveTracks === undefined
              ? options.tracks
              : await options.resolveTracks(storedTrackIds),
        })

  if (!options.canRestore()) {
    return
  }

  options.onRestore(restoredTracks, storedPlayback)
}
