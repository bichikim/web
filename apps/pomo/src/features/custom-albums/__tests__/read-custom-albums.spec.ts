/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, expect, it} from 'vitest'

import {
  ALBUM_STORE_NAME,
  openCustomAlbumDatabase,
  readRequest,
  TRACK_STORE_NAME,
  waitForTransaction,
} from '../database'
import {readCustomAlbums} from '../read-custom-albums'
import {revokeCustomTrackObjectUrls} from '../to-custom-p-track'

const HEALTHY_TRACK_ID = 'custom-track:healthy'

const clearCustomAlbumDatabase = async (): Promise<void> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const finished = waitForTransaction(transaction)

  transaction.objectStore(ALBUM_STORE_NAME).clear()
  transaction.objectStore(TRACK_STORE_NAME).clear()

  await finished
}

afterEach(async () => {
  await clearCustomAlbumDatabase()
  revokeCustomTrackObjectUrls(new Set([HEALTHY_TRACK_ID]))
})

it('should retain healthy albums when other stored albums reference missing or mismatched tracks', async () => {
  const healthyAlbum = {
    artist: 'Healthy artist',
    coverIcon: 'disc',
    coverSource: 'manual',
    createdAt: 1,
    id: 'custom-album:healthy',
    title: 'Healthy album',
    trackIds: [HEALTHY_TRACK_ID],
    updatedAt: 1,
  }
  const missingTrackAlbum = {
    artist: 'Missing artist',
    coverIcon: 'disc',
    coverSource: 'manual',
    createdAt: 2,
    id: 'custom-album:missing-track',
    title: 'Missing track album',
    trackIds: ['custom-track:missing'],
    updatedAt: 2,
  }
  const mismatchedTrackAlbum = {
    artist: 'Mismatched artist',
    coverIcon: 'disc',
    coverSource: 'manual',
    createdAt: 3,
    id: 'custom-album:mismatched-track',
    title: 'Mismatched track album',
    trackIds: ['custom-track:healthy'],
    updatedAt: 3,
  }
  const healthyTrack = {
    albumId: healthyAlbum.id,
    artist: healthyAlbum.artist,
    audio: new Blob(['audio'], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'healthy.mp3',
    id: HEALTHY_TRACK_ID,
    title: 'Healthy track',
  }
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const finished = waitForTransaction(transaction)

  transaction.objectStore(ALBUM_STORE_NAME).put(healthyAlbum)
  transaction.objectStore(ALBUM_STORE_NAME).put(missingTrackAlbum)
  transaction.objectStore(ALBUM_STORE_NAME).put(mismatchedTrackAlbum)
  transaction.objectStore(TRACK_STORE_NAME).put(healthyTrack)

  await finished

  const albums = await readCustomAlbums()
  const verificationTransaction = database.transaction(
    [ALBUM_STORE_NAME, TRACK_STORE_NAME],
    'readonly',
  )
  const [storedAlbums, storedTracks] = await Promise.all([
    readRequest<unknown[]>(verificationTransaction.objectStore(ALBUM_STORE_NAME).getAll()),
    readRequest<unknown[]>(verificationTransaction.objectStore(TRACK_STORE_NAME).getAll()),
  ])

  expect(albums.map(({id}) => id)).toEqual([healthyAlbum.id])
  expect(storedAlbums).toHaveLength(3)
  expect(storedAlbums).toEqual(
    expect.arrayContaining([healthyAlbum, missingTrackAlbum, mismatchedTrackAlbum]),
  )
  expect(storedTracks).toEqual([
    expect.objectContaining({albumId: healthyAlbum.id, id: healthyTrack.id}),
  ])
})
