/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, expect, it} from 'vitest'
import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  TRACK_STORE_NAME,
  waitForTransaction,
} from '../database'
import {readCustomAlbumLibraryBytes} from '../read-custom-album-library-bytes'

const writeAlbums = async () => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const finished = waitForTransaction(transaction)
  for (const [id, coverBytes, audioBytes] of [
    ['a', 100, 300],
    ['b', 200, 400],
  ] as const) {
    transaction.objectStore(ALBUM_STORE_NAME).put({
      artist: '',
      coverIcon: 'disc',
      coverImage: new Blob([new Uint8Array(coverBytes)], {type: 'image/webp'}),
      coverSource: 'manual',
      createdAt: 1,
      id,
      title: id,
      trackIds: [id],
      updatedAt: 1,
    })
    transaction.objectStore(TRACK_STORE_NAME).put({
      albumId: id,
      artist: '',
      audio: new Blob([new Uint8Array(audioBytes)], {type: 'audio/mpeg'}),
      durationSeconds: 60,
      fileName: `${id}.mp3`,
      id,
      title: id,
    })
  }
  await finished
}

afterEach(async () => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const finished = waitForTransaction(transaction)
  transaction.objectStore(ALBUM_STORE_NAME).clear()
  transaction.objectStore(TRACK_STORE_NAME).clear()
  await finished
})

it('should return zero for an empty library', async () => {
  await expect(readCustomAlbumLibraryBytes({excludedAlbumId: null})).resolves.toBe(0)
})

it.each([
  [null, 1000],
  ['a', 600],
  ['b', 400],
] as const)(
  'should sum audio and covers while excluding the edited album: %s',
  async (excludedAlbumId, expectedBytes) => {
    await writeAlbums()
    await expect(readCustomAlbumLibraryBytes({excludedAlbumId})).resolves.toBe(expectedBytes)
  },
)
