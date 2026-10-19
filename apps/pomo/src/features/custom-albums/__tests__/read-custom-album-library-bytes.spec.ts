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

it('should count stored audio without requiring a cover or a referenced track ID', async () => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const finished = waitForTransaction(transaction)
  transaction.objectStore(ALBUM_STORE_NAME).put({
    artist: '',
    coverIcon: 'disc',
    createdAt: 1,
    id: 'album',
    title: 'Album without cover',
    trackIds: [],
    updatedAt: 1,
  })
  transaction.objectStore(TRACK_STORE_NAME).put({
    albumId: 'album',
    artist: '',
    audio: new Blob(['1234567'], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'track.mp3',
    id: 'unreferenced',
    title: 'Track',
  })
  await finished

  await expect(readCustomAlbumLibraryBytes({excludedAlbumId: null})).resolves.toBe(7)
})

it('should reject corrupted audio before counting its apparent size', async () => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction(TRACK_STORE_NAME, 'readwrite')
  const finished = waitForTransaction(transaction)
  transaction.objectStore(TRACK_STORE_NAME).put({
    albumId: 'album',
    artist: '',
    audio: {size: Number.NaN},
    durationSeconds: 60,
    fileName: 'track.mp3',
    id: 'corrupted',
    title: 'Track',
  })
  await finished

  await expect(readCustomAlbumLibraryBytes({excludedAlbumId: null})).rejects.toMatchObject({
    code: 'corrupt-data',
  })
})

it.each([
  [null, 1000],
  ['a', 600],
  ['b', 400],
  ['missing', 1000],
] as const)(
  'should sum audio and covers while excluding the edited album: %s',
  async (excludedAlbumId, expectedBytes) => {
    await writeAlbums()
    await expect(readCustomAlbumLibraryBytes({excludedAlbumId})).resolves.toBe(expectedBytes)
  },
)
