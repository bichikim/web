import type {PTrack} from './focus-room-playlist'

export interface ResolvePPlaylistOptions {
  readonly defaultTracks: readonly PTrack[]
  readonly storedTrackIds: readonly string[] | null
  readonly tracks: readonly PTrack[]
}

/** Resolves a saved playlist against the current catalog while preserving the default fallback. */
export const resolvePPlaylist = (options: ResolvePPlaylistOptions): readonly PTrack[] => {
  if (options.storedTrackIds === null) {
    return options.defaultTracks
  }

  const tracksById = new Map(options.tracks.map((track) => [track.id, track]))
  const restoredTracks = options.storedTrackIds.flatMap((trackId) => {
    const track = tracksById.get(trackId)
    return track === undefined ? [] : [track]
  })

  if (options.storedTrackIds.length > 0 && restoredTracks.length === 0) {
    return options.defaultTracks
  }

  return restoredTracks
}
