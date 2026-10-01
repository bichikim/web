/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'

import {
  openCustomAlbumDatabase,
  TRACK_STORE_NAME,
  waitForTransaction,
} from 'src/features/custom-albums/database'
import {readCustomAlbumTracks} from 'src/features/custom-albums'

const VALID_TRACK_ID = 'custom-track:valid'
const CORRUPT_TRACK_ID = 'custom-track:corrupt'

const putTrack = async (track: unknown): Promise<void> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction(TRACK_STORE_NAME, 'readwrite')
  transaction.objectStore(TRACK_STORE_NAME).put(track)
  await waitForTransaction(transaction)
}

const clearTracks = async (): Promise<void> => {
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction(TRACK_STORE_NAME, 'readwrite')
  transaction.objectStore(TRACK_STORE_NAME).clear()
  await waitForTransaction(transaction)
}

afterEach(async () => {
  await clearTracks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should return valid custom tracks even when another requested track is corrupt', async () => {
  const audio = new Blob(['audio'], {type: 'audio/mpeg'})

  await putTrack({
    albumId: 'custom-album:album-1',
    artist: 'Artist',
    audio,
    durationSeconds: 60,
    fileName: 'valid.mp3',
    id: VALID_TRACK_ID,
    title: 'Valid track',
  })
  await putTrack({
    albumId: 'custom-album:album-1',
    artist: 'Artist',
    audio,
    durationSeconds: -1,
    fileName: 'corrupt.mp3',
    id: CORRUPT_TRACK_ID,
    title: 'Corrupt track',
  })

  const tracks = await readCustomAlbumTracks({trackIds: [VALID_TRACK_ID, CORRUPT_TRACK_ID]})

  expect(tracks).toEqual([
    expect.objectContaining({
      id: VALID_TRACK_ID,
      title: 'Valid track',
    }),
  ])
})
