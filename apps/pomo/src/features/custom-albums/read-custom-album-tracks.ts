import type {PTrack} from '../focus-room-audio'
import {
  openCustomAlbumDatabase,
  readRequest,
  storedTrackSchema,
  TRACK_STORE_NAME,
  waitForTransaction,
} from './database'
import {CUSTOM_TRACK_ID_PREFIX, CustomAlbumError} from './model'
import {toCustomPTrack} from './to-custom-p-track'

export interface ReadCustomAlbumTracksOptions {
  readonly trackIds: readonly string[]
}

const parseStoredTrack = (value: unknown) => {
  const result = storedTrackSchema.safeParse(value)

  if (!result.success) {
    throw new CustomAlbumError('corrupt-data', {cause: result.error})
  }

  return result.data
}

export const readCustomAlbumTracks = async (
  options: ReadCustomAlbumTracksOptions,
): Promise<readonly PTrack[]> => {
  const trackIds = Array.from(
    new Set(options.trackIds.filter((trackId) => trackId.startsWith(CUSTOM_TRACK_ID_PREFIX))),
  )

  if (trackIds.length === 0) {
    return []
  }

  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction(TRACK_STORE_NAME, 'readonly')
  const finished = waitForTransaction(transaction)
  const trackRequests = trackIds.map((trackId) =>
    readRequest<unknown>(transaction.objectStore(TRACK_STORE_NAME).get(trackId)),
  )
  const [, rawTracks] = await Promise.all([finished, Promise.all(trackRequests)])
  const tracks = rawTracks.flatMap((track) =>
    track === undefined ? [] : [parseStoredTrack(track)],
  )

  return tracks.map(toCustomPTrack)
}
