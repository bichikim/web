import {CUSTOM_TRACK_ID_PREFIX, readCustomAlbumTracks} from '../../features/custom-albums'
import type {PTrack} from '../../features/focus-room-audio'

interface ResolveStoredPlaylistTracksOptions {
  readonly onError: (error: unknown) => void
  readonly sourceTracks: readonly PTrack[]
  readonly storedTrackIds: Promise<readonly string[] | null>
}

export const resolveStoredPlaylistTracks = async (
  options: ResolveStoredPlaylistTracksOptions,
): Promise<readonly PTrack[]> => {
  const storedTrackIds = await options.storedTrackIds
  const customTrackIds =
    storedTrackIds?.filter((trackId) => trackId.startsWith(CUSTOM_TRACK_ID_PREFIX)) ?? []

  if (customTrackIds.length === 0) {
    return options.sourceTracks
  }

  try {
    const customTracks = await readCustomAlbumTracks({trackIds: customTrackIds})
    return [...options.sourceTracks, ...customTracks]
  } catch (error: unknown) {
    options.onError(error)
    return options.sourceTracks
  }
}
