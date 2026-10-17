/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'

import * as customAlbumDatabase from '../database'
import {readCustomAlbumTracks} from '../read-custom-album-tracks'
import {revokeCustomTrackObjectUrls} from '../to-custom-p-track'
import {resolveStoredPlaylistTracks} from '../../../components/media-player/resolve-stored-playlist-tracks'
import type {PTrack} from '../../focus-room-audio'

const VALID_TRACK_A_ID = 'custom-track:valid-a'
const VALID_TRACK_B_ID = 'custom-track:valid-b'
const CORRUPT_TRACK_ID = 'custom-track:corrupt'
const MISSING_TRACK_ID = 'custom-track:missing'

const BUNDLED_TRACK = {
  artist: 'Artist',
  durationSeconds: 120,
  id: 'bundled-track',
  source: '/bundled.mp3',
  title: 'Bundled',
} as const satisfies PTrack

const createStoredTrack = (id: string, durationSeconds = 60) => ({
  albumId: 'custom-album:test',
  artist: 'Artist',
  audio: new Blob(['audio'], {type: 'audio/mpeg'}),
  durationSeconds,
  fileName: `${id}.mp3`,
  id,
  title: id,
})

const putStoredTracks = async (tracks: readonly unknown[]): Promise<void> => {
  const database = await customAlbumDatabase.openCustomAlbumDatabase()
  const transaction = database.transaction(customAlbumDatabase.TRACK_STORE_NAME, 'readwrite')
  const finished = customAlbumDatabase.waitForTransaction(transaction)
  const store = transaction.objectStore(customAlbumDatabase.TRACK_STORE_NAME)

  tracks.forEach((track) => store.put(track))

  await finished
}

const clearStoredTracks = async (): Promise<void> => {
  const database = await customAlbumDatabase.openCustomAlbumDatabase()
  const transaction = database.transaction(customAlbumDatabase.TRACK_STORE_NAME, 'readwrite')
  const finished = customAlbumDatabase.waitForTransaction(transaction)

  transaction.objectStore(customAlbumDatabase.TRACK_STORE_NAME).clear()

  await finished
}

const readStoredTrack = async (trackId: string): Promise<unknown> => {
  const database = await customAlbumDatabase.openCustomAlbumDatabase()
  const transaction = database.transaction(customAlbumDatabase.TRACK_STORE_NAME, 'readonly')
  const finished = customAlbumDatabase.waitForTransaction(transaction)
  const track = customAlbumDatabase.readRequest<unknown>(
    transaction.objectStore(customAlbumDatabase.TRACK_STORE_NAME).get(trackId),
  )
  const [storedTrack] = await Promise.all([track, finished])

  return storedTrack
}

const seedMixedTracks = async (): Promise<void> => {
  await putStoredTracks([
    createStoredTrack(VALID_TRACK_A_ID),
    createStoredTrack(CORRUPT_TRACK_ID, -1),
    createStoredTrack(VALID_TRACK_B_ID),
  ])
}

afterEach(async () => {
  try {
    await clearStoredTracks()
  } finally {
    revokeCustomTrackObjectUrls(new Set([VALID_TRACK_A_ID, VALID_TRACK_B_ID]))
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

it('returns healthy requested tracks in order and reports corrupt records without deleting them', async () => {
  await seedMixedTracks()
  const onError = vi.fn()

  const tracks = await readCustomAlbumTracks({
    onError,
    trackIds: [
      VALID_TRACK_B_ID,
      CORRUPT_TRACK_ID,
      VALID_TRACK_A_ID,
      VALID_TRACK_B_ID,
      MISSING_TRACK_ID,
      BUNDLED_TRACK.id,
    ],
  })

  expect(tracks.map(({id}) => id)).toEqual([VALID_TRACK_B_ID, VALID_TRACK_A_ID])
  expect(onError).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      cause: expect.objectContaining({issues: expect.any(Array)}),
      code: 'corrupt-data',
    }),
    CORRUPT_TRACK_ID,
  )
  expect(await readStoredTrack(CORRUPT_TRACK_ID)).toMatchObject({durationSeconds: -1})
})

it('restores healthy custom tracks alongside bundled tracks when another stored record is corrupt', async () => {
  await seedMixedTracks()
  const onError = vi.fn()

  const tracks = await resolveStoredPlaylistTracks({
    onError,
    sourceTracks: [BUNDLED_TRACK],
    storedTrackIds: Promise.resolve([
      VALID_TRACK_B_ID,
      CORRUPT_TRACK_ID,
      VALID_TRACK_A_ID,
      VALID_TRACK_B_ID,
      MISSING_TRACK_ID,
    ]),
  })

  expect(tracks.map(({id}) => id)).toEqual([BUNDLED_TRACK.id, VALID_TRACK_B_ID, VALID_TRACK_A_ID])
  expect(onError).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({code: 'corrupt-data'}),
    CORRUPT_TRACK_ID,
  )
  expect(await readStoredTrack(CORRUPT_TRACK_ID)).toMatchObject({durationSeconds: -1})
})

it('propagates IndexedDB request failures without reporting them as corrupt records', async () => {
  const storageError = new Error('IndexedDB request failed')
  const onError = vi.fn()
  vi.spyOn(customAlbumDatabase, 'readRequest').mockRejectedValueOnce(storageError)

  await expect(readCustomAlbumTracks({onError, trackIds: [VALID_TRACK_A_ID]})).rejects.toBe(
    storageError,
  )

  expect(onError).not.toHaveBeenCalled()
})
