import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  TRACK_STORE_NAME,
  waitForTransaction,
} from 'src/features/custom-albums/database'
export const clearCustomAlbumDatabase = async (): Promise<void> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const finished = waitForTransaction(transaction)

  transaction.objectStore(ALBUM_STORE_NAME).clear()
  transaction.objectStore(TRACK_STORE_NAME).clear()

  await finished
}
