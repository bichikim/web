import {
  type PlaylistPreference,
  type PPlaybackState,
  type PTrack,
  resolvePPlaylist,
} from '../../features/focus-room-audio'

export interface RestorePPlayerStateOptions {
  readonly canRestore: () => boolean
  readonly defaultTracks: readonly PTrack[]
  readonly onRestore: (
    tracks: readonly PTrack[],
    playback: PPlaybackState | null,
    entryIds?: readonly string[],
  ) => void
  readonly playbackRequest: Promise<PPlaybackState | null>
  readonly playlistRequest: Promise<PlaylistPreference | readonly string[] | null>
  readonly resolveTracks?: (storedTrackIds: readonly string[]) => Promise<readonly PTrack[]>
  readonly tracks: readonly PTrack[]
}

/** Restores the saved playlist and playback state after both requests settle. */
export const restorePPlayerState = async (options: RestorePPlayerStateOptions): Promise<void> => {
  const [requestedPlaylist, storedPlayback] = await Promise.all([
    options.playlistRequest,
    options.playbackRequest,
  ])
  const storedPlaylist =
    requestedPlaylist === null
      ? null
      : 'trackIds' in requestedPlaylist
        ? requestedPlaylist
        : {trackIds: requestedPlaylist}

  if ((storedPlaylist?.trackIds ?? null) === null && storedPlayback === null) {
    return
  }

  if (!options.canRestore()) {
    return
  }

  const storedTrackIds = storedPlaylist?.trackIds ?? null
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
  const restoredEntryIds =
    storedTrackIds === null || storedPlaylist?.entryIds === undefined
      ? undefined
      : resolveEntryIdsForTracks({
          entryIds: storedPlaylist.entryIds,
          restoredTracks,
          storedTrackIds,
        })

  if (!options.canRestore()) {
    return
  }

  if (restoredEntryIds === undefined) {
    options.onRestore(restoredTracks, storedPlayback)
    return
  }

  options.onRestore(restoredTracks, storedPlayback, restoredEntryIds)
}

const resolveEntryIdsForTracks = (options: {
  readonly entryIds: readonly string[]
  readonly restoredTracks: readonly PTrack[]
  readonly storedTrackIds: readonly string[]
}): readonly string[] | undefined => {
  if (
    options.entryIds.length !== options.storedTrackIds.length ||
    new Set(options.entryIds).size !== options.entryIds.length
  ) {
    return undefined
  }

  const entriesByTrackId = new Map<string, string[]>()
  options.storedTrackIds.forEach((trackId, index) => {
    const entryId = options.entryIds[index]
    if (entryId === undefined) {
      return
    }
    const entries = entriesByTrackId.get(trackId) ?? []
    entries.push(entryId)
    entriesByTrackId.set(trackId, entries)
  })

  const restoredEntryIds = options.restoredTracks.map((track) =>
    entriesByTrackId.get(track.id)?.shift(),
  )
  return restoredEntryIds.every((entryId) => entryId !== undefined)
    ? (restoredEntryIds as string[])
    : undefined
}
