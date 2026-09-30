import type {PResolvedAlbum} from '../focus-room-audio'
import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  parseStoredAlbums,
  parseStoredTracks,
  readRequest,
  type StoredCustomAlbum,
  type StoredCustomTrack,
  TRACK_STORE_NAME,
  waitForTransaction,
} from './database'
import {CUSTOM_ALBUM_ICON_CLASSES, CustomAlbumError} from './model'
import {toCustomPTrack} from './to-custom-p-track'

export type ResolvedCustomAlbum = PResolvedAlbum & {readonly customCoverImage: Blob | null}

const toResolvedAlbum = (
  album: StoredCustomAlbum,
  tracksById: ReadonlyMap<string, StoredCustomTrack>,
): ResolvedCustomAlbum => {
  const tracks = album.trackIds.map((trackId) => {
    const track = tracksById.get(trackId)

    if (track === undefined || track.albumId !== album.id) {
      throw new CustomAlbumError('corrupt-data')
    }

    return track
  })
  const playableTracks = tracks.map(toCustomPTrack)

  return {
    customCoverImage: album.coverImage ?? null,
    description: album.artist,
    icon: CUSTOM_ALBUM_ICON_CLASSES[album.coverIcon],
    id: album.id,
    title: album.title,
    trackCount: playableTracks.length,
    trackIds: album.trackIds,
    trackListings: playableTracks.map(({artist, id, title}) => ({artist, id, title})),
    tracks: playableTracks,
  }
}

export const readCustomAlbums = async (): Promise<readonly ResolvedCustomAlbum[]> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readonly')
  const finished = waitForTransaction(transaction)
  const albumsRequest = readRequest<unknown[]>(transaction.objectStore(ALBUM_STORE_NAME).getAll())
  const tracksRequest = readRequest<unknown[]>(transaction.objectStore(TRACK_STORE_NAME).getAll())
  const [rawAlbums, rawTracks] = await Promise.all([
    Promise.all([finished, albumsRequest]).then(([, albums]) => albums),
    tracksRequest,
  ])
  const albums = parseStoredAlbums(rawAlbums)
  const tracks = parseStoredTracks(rawTracks)
  const tracksById = new Map(tracks.map((track) => [track.id, track]))

  return albums
    .toSorted((left, right) => left.createdAt - right.createdAt)
    .map((album) => toResolvedAlbum(album, tracksById))
}
