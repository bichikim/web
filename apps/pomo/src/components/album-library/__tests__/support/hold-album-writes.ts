import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  TRACK_STORE_NAME,
  waitForTransaction,
} from 'src/features/custom-albums/database'

export const holdAlbumWrites = async () => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const finished = waitForTransaction(transaction)
  let isHolding = true
  const requestRead = () => {
    if (isHolding) {
      const request = transaction.objectStore(ALBUM_STORE_NAME).get('album-editor-test-lock')
      request.onsuccess = requestRead
    }
  }
  requestRead()
  return async () => {
    isHolding = false
    await finished
  }
}
