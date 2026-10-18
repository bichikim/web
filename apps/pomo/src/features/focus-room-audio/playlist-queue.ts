import {differenceBy, uniqBy} from 'es-toolkit/array'
import type {PTrack} from './focus-room-playlist'

/** Adds only tracks that are not already present while preserving queue order. */
export const appendUniqueTracks = (
  tracks: readonly PTrack[],
  tracksToAdd: readonly PTrack[],
): readonly PTrack[] => {
  const uniqueTracks = differenceBy(
    uniqBy(tracksToAdd, (track) => track.id),
    tracks,
    (track) => track.id,
  )

  return uniqueTracks.length === 0 ? tracks : [...tracks, ...uniqueTracks]
}
