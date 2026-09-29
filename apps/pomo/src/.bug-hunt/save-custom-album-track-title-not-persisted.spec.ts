/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'

const DATABASE_NAME = 'pomo-custom-albums'

const resetCustomAlbumStorage = async (): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
  vi.resetModules()
}

afterEach(async () => {
  await resetCustomAlbumStorage()
  vi.unstubAllGlobals()
})

it('should persist an updated track title when re-saving a custom album', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

  const database = await import('src/features/custom-albums/database')
  const {parseStoredTracks: parseStoredTracksOriginal} = database
  vi.spyOn(database, 'parseStoredTracks').mockImplementation((value: unknown) =>
    parseStoredTracksOriginal(
      Array.isArray(value)
        ? value.map((track) =>
            typeof track === 'object' &&
            track !== null &&
            'audio' in track &&
            !(track.audio instanceof Blob)
              ? {...track, audio: new Blob(['audio'], {type: 'audio/mpeg'})}
              : track,
          )
        : value,
    ),
  )

  const {readCustomAlbumDraft, saveCustomAlbum} = await import('src/features/custom-albums')
  const trackId = 'custom-track:track-1'
  const audio = new Blob(['audio'], {type: 'audio/mpeg'})
  const baseTrack = {
    audio,
    durationSeconds: 60,
    fileName: 'song.mp3',
    id: trackId,
    title: 'Original title',
  }

  const albumId = await saveCustomAlbum({
    albumId: null,
    artist: 'Artist',
    coverIcon: 'disc',
    coverImage: {kind: 'keep'},
    coverSource: 'automatic',
    title: 'Album',
    tracks: [baseTrack],
  })

  await saveCustomAlbum({
    albumId,
    artist: 'Artist',
    coverIcon: 'disc',
    coverImage: {kind: 'keep'},
    coverSource: 'automatic',
    title: 'Album',
    tracks: [{...baseTrack, title: 'Renamed title'}],
  })

  const draft = await readCustomAlbumDraft({albumId})

  expect(draft?.tracks[0]?.title).toBe('Renamed title')
})
