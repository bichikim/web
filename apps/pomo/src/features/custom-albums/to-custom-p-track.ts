import {replaceBlobObjectUrl} from 'src/features/blob-object-url'
import type {PTrack} from '../focus-room-audio'
import type {StoredCustomTrack} from './database'

const trackObjectUrls = new Map<string, string>()

export const revokeCustomTrackObjectUrls = (trackIds: ReadonlySet<string>): void => {
  for (const trackId of trackIds) {
    const source = trackObjectUrls.get(trackId)

    if (source !== undefined) {
      replaceBlobObjectUrl(source, () => null)
      trackObjectUrls.delete(trackId)
    }
  }
}

export const toCustomPTrack = (track: StoredCustomTrack): PTrack => {
  const existingSource = trackObjectUrls.get(track.id)

  if (existingSource !== undefined) {
    return {
      artist: track.artist,
      durationSeconds: track.durationSeconds,
      id: track.id,
      source: existingSource,
      title: track.title,
    }
  }

  const source = replaceBlobObjectUrl(null, () => track.audio)
  trackObjectUrls.set(track.id, source)

  return {
    artist: track.artist,
    durationSeconds: track.durationSeconds,
    id: track.id,
    source,
    title: track.title,
  }
}
