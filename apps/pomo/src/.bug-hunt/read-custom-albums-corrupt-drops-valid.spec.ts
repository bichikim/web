/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'

import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  TRACK_STORE_NAME,
  waitForTransaction,
} from 'src/features/custom-albums/database'
import {readCustomAlbums} from 'src/features/custom-albums'

const HEALTHY_ALBUM_ID = 'custom-album:healthy'
const CORRUPT_ALBUM_ID = 'custom-album:corrupt'
const HEALTHY_TRACK_ID = 'custom-track:healthy'

const clearDatabase = async (): Promise<void> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  transaction.objectStore(ALBUM_STORE_NAME).clear()
  transaction.objectStore(TRACK_STORE_NAME).clear()
  await waitForTransaction(transaction)
}

afterEach(async () => {
  await clearDatabase()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should still list healthy custom albums when another album references a missing track', async () => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const audio = new Blob(['audio'], {type: 'audio/mpeg'})

  transaction.objectStore(TRACK_STORE_NAME).put({
    albumId: HEALTHY_ALBUM_ID,
    artist: 'Artist',
    audio,
    durationSeconds: 60,
    fileName: 'healthy.mp3',
    id: HEALTHY_TRACK_ID,
    title: 'Healthy track',
  })
  transaction.objectStore(ALBUM_STORE_NAME).put({
    artist: 'Healthy artist',
    coverIcon: 'disc',
    coverSource: 'manual',
    createdAt: 1,
    id: HEALTHY_ALBUM_ID,
    title: 'Healthy album',
    trackIds: [HEALTHY_TRACK_ID],
    updatedAt: 1,
  })
  transaction.objectStore(ALBUM_STORE_NAME).put({
    artist: 'Broken artist',
    coverIcon: 'disc',
    coverSource: 'manual',
    createdAt: 2,
    id: CORRUPT_ALBUM_ID,
    title: 'Broken album',
    trackIds: ['custom-track:missing'],
    updatedAt: 2,
  })

  await waitForTransaction(transaction)

  const albums = await readCustomAlbums()

  expect(albums).toEqual([
    expect.objectContaining({
      id: HEALTHY_ALBUM_ID,
      title: 'Healthy album',
      tracks: [expect.objectContaining({id: HEALTHY_TRACK_ID})],
    }),
  ])
})
