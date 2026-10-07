import {sumBy} from 'es-toolkit/math'
import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  parseStoredAlbums,
  parseStoredTracks,
  readRequest,
  TRACK_STORE_NAME,
  waitForTransaction,
} from './database'

export interface ReadCustomAlbumLibraryBytesOptions {
  readonly excludedAlbumId: string | null
}

/** Reads stored audio and cover bytes, excluding the album replaced by an editor draft. */
export const readCustomAlbumLibraryBytes = async (
  options: ReadCustomAlbumLibraryBytesOptions,
): Promise<number> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readonly')
  const finished = waitForTransaction(transaction)
  const albumsRequest = readRequest<unknown[]>(transaction.objectStore(ALBUM_STORE_NAME).getAll())
  const tracksRequest = readRequest<unknown[]>(transaction.objectStore(TRACK_STORE_NAME).getAll())
  const [, rawAlbums, rawTracks] = await Promise.all([finished, albumsRequest, tracksRequest])
  const albums = parseStoredAlbums(rawAlbums)
  const tracks = parseStoredTracks(rawTracks)

  return (
    sumBy(
      tracks.filter((track) => track.albumId !== options.excludedAlbumId),
      (track) => track.audio.size,
    ) +
    sumBy(
      albums.filter((album) => album.id !== options.excludedAlbumId),
      (album) => album.coverImage?.size ?? 0,
    )
  )
}
