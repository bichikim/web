import type {PTrack} from './focus-room-playlist'

/** Adds only tracks that are not already present while preserving queue order. */
export const appendUniqueTracks = (tracks: readonly PTrack[], tracksToAdd: readonly PTrack[]) => {
  const trackIds = new Set(tracks.map((track) => track.id))
  const uniqueTracks = tracksToAdd.filter((track) => {
    if (trackIds.has(track.id)) {
      return false
    }

    trackIds.add(track.id)
    return true
  })

  return uniqueTracks.length === 0 ? tracks : [...tracks, ...uniqueTracks]
}
