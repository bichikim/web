import * as customAlbumDatabase from '../../database'

const DEFAULT_DURATION_SECONDS = 60

export const createStoredTrack = (
  id: string,
  durationSeconds = DEFAULT_DURATION_SECONDS,
): customAlbumDatabase.StoredCustomTrack => ({
  albumId: 'custom-album:test',
  artist: 'Artist',
  audio: new Blob(['audio'], {type: 'audio/mpeg'}),
  durationSeconds,
  fileName: `${id}.mp3`,
  id,
  title: id,
})

export const putStoredTracks = async (tracks: readonly unknown[]): Promise<void> => {
  const database = await customAlbumDatabase.openCustomAlbumDatabase()
  const transaction = database.transaction(customAlbumDatabase.TRACK_STORE_NAME, 'readwrite')
  const finished = customAlbumDatabase.waitForTransaction(transaction)
  const store = transaction.objectStore(customAlbumDatabase.TRACK_STORE_NAME)

  tracks.forEach((track) => store.put(track))

  await finished
}

export const clearStoredTracks = async (): Promise<void> => {
  const database = await customAlbumDatabase.openCustomAlbumDatabase()
  const transaction = database.transaction(customAlbumDatabase.TRACK_STORE_NAME, 'readwrite')
  const finished = customAlbumDatabase.waitForTransaction(transaction)

  transaction.objectStore(customAlbumDatabase.TRACK_STORE_NAME).clear()

  await finished
}

export const readStoredTrack = async (trackId: string): Promise<unknown> => {
  const database = await customAlbumDatabase.openCustomAlbumDatabase()
  const transaction = database.transaction(customAlbumDatabase.TRACK_STORE_NAME, 'readonly')
  const finished = customAlbumDatabase.waitForTransaction(transaction)
  const track = customAlbumDatabase.readRequest<unknown>(
    transaction.objectStore(customAlbumDatabase.TRACK_STORE_NAME).get(trackId),
  )
  const [storedTrack] = await Promise.all([track, finished])

  return storedTrack
}
