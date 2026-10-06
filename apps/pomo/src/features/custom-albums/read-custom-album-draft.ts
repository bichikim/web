import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  parseStoredTracks,
  readRequest,
  storedAlbumSchema,
  TRACK_STORE_NAME,
  waitForTransaction,
} from './database'
import {type CustomAlbumDraft, CustomAlbumError} from './model'

export interface ReadCustomAlbumDraftOptions {
  readonly albumId: string
}

export const readCustomAlbumDraft = async (
  options: ReadCustomAlbumDraftOptions,
): Promise<CustomAlbumDraft | null> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readonly')
  const finished = waitForTransaction(transaction)
  const albumRequest = readRequest<unknown>(
    transaction.objectStore(ALBUM_STORE_NAME).get(options.albumId),
  )
  const tracksRequest = readRequest<unknown[]>(
    transaction.objectStore(TRACK_STORE_NAME).index('albumId').getAll(options.albumId),
  )
  const [rawAlbum, rawTracks] = await Promise.all([
    Promise.all([finished, albumRequest]).then(([, value]) => value),
    tracksRequest,
  ])

  if (rawAlbum === undefined) {
    return null
  }

  const albumResult = storedAlbumSchema.safeParse(rawAlbum)

  if (!albumResult.success) {
    throw new CustomAlbumError('corrupt-data', {cause: albumResult.error})
  }

  const tracksById = new Map(parseStoredTracks(rawTracks).map((track) => [track.id, track]))
  const tracks = albumResult.data.trackIds.map((trackId) => {
    const track = tracksById.get(trackId)

    if (track === undefined) {
      throw new CustomAlbumError('corrupt-data')
    }

    return {
      audio: track.audio,
      durationSeconds: track.durationSeconds,
      fileName: track.fileName,
      id: track.id,
      title: track.title,
    }
  })

  return {
    ...albumResult.data,
    coverImage: albumResult.data.coverImage ?? null,
    coverSource:
      albumResult.data.coverSource ??
      (albumResult.data.coverImage === undefined && albumResult.data.coverIcon === 'disc'
        ? 'automatic'
        : 'manual'),
    tracks,
  }
}
