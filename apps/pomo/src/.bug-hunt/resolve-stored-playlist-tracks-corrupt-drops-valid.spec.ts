/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'

import {resolveStoredPlaylistTracks} from 'src/components/media-player/resolve-stored-playlist-tracks'
import {
  openCustomAlbumDatabase,
  TRACK_STORE_NAME,
  waitForTransaction,
} from 'src/features/custom-albums/database'
import type {PTrack} from 'src/features/focus-room-audio'

const BUNDLED_TRACK = {
  artist: 'Artist',
  durationSeconds: 120,
  id: 'bundled-track',
  source: '/bundled.mp3',
  title: 'Bundled',
} as const satisfies PTrack

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

it('should keep playable custom tracks when another saved custom id is corrupt', async () => {
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

  const tracks = await resolveStoredPlaylistTracks({
    onError: () => undefined,
    sourceTracks: [BUNDLED_TRACK],
    storedTrackIds: Promise.resolve([VALID_TRACK_ID, CORRUPT_TRACK_ID]),
  })

  expect(tracks).toEqual([
    BUNDLED_TRACK,
    expect.objectContaining({
      id: VALID_TRACK_ID,
      title: 'Valid track',
    }),
  ])
})
