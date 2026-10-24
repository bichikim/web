import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  TRACK_STORE_NAME,
  waitForTransaction,
} from './database'

export const deleteCustomAlbum = async (albumId: string): Promise<void> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const albumStore = transaction.objectStore(ALBUM_STORE_NAME)
  const trackStore = transaction.objectStore(TRACK_STORE_NAME)
  const finished = waitForTransaction(transaction)
  const trackKeysRequest = trackStore.index('albumId').getAllKeys(albumId)

  trackKeysRequest.onsuccess = () => {
    for (const trackId of trackKeysRequest.result) {
      trackStore.delete(trackId)
    }

    albumStore.delete(albumId)
  }

  await finished
}
