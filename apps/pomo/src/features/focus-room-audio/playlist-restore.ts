import {CUSTOM_TRACK_ID_PREFIX} from '../custom-albums/model'
import type {PTrack} from './focus-room-playlist'

export interface ResolvePPlaylistOptions {
  readonly defaultTracks: readonly PTrack[]
  readonly storedTrackIds: readonly string[] | null
  readonly tracks: readonly PTrack[]
}

/** 저장된 트랙을 복원하며 오래된 번들 ID에 대한 기본 목록 대체 동작은 유지한다. */
export const resolvePPlaylist = (options: ResolvePPlaylistOptions): readonly PTrack[] => {
  if (options.storedTrackIds === null) {
    return options.defaultTracks
  }

  const tracksById = new Map(options.tracks.map((track) => [track.id, track]))
  const restoredTracks = options.storedTrackIds.flatMap((trackId) => {
    const track = tracksById.get(trackId)
    return track === undefined ? [] : [track]
  })
  const hasCustomTrackIds = options.storedTrackIds.some((trackId) =>
    trackId.startsWith(CUSTOM_TRACK_ID_PREFIX),
  )

  if (options.storedTrackIds.length > 0 && restoredTracks.length === 0 && !hasCustomTrackIds) {
    return options.defaultTracks
  }

  return restoredTracks
}
