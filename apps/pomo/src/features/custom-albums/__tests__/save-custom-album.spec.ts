/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'

const DATABASE_NAME = 'pomo-custom-albums'

const resetAlbumDatabase = async (): Promise<void> => {
  try {
    const {openCustomAlbumDatabase} = await import('src/features/custom-albums/database')
    const database = await openCustomAlbumDatabase()
    database.close()

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('Custom album database deletion was blocked.'))
    })
  } finally {
    vi.resetModules()
  }
}

afterEach(async () => {
  try {
    await resetAlbumDatabase()
  } finally {
    vi.unstubAllGlobals()
  }
})

it('should persist a changed track title when re-saving a custom album', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

  const {readCustomAlbumDraft, readCustomAlbums, saveCustomAlbum} =
    await import('src/features/custom-albums')
  const trackId = 'custom-track:track-1'
  const baseTrack = {
    audio: new Blob(['audio'], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'song.mp3',
    id: trackId,
    title: 'Original title',
  }
  const albumOptions = {
    albumId: null,
    artist: 'Artist',
    coverIcon: 'disc' as const,
    coverImage: {kind: 'keep' as const},
    coverSource: 'automatic' as const,
    title: 'Album',
  }

  const albumId = await saveCustomAlbum({...albumOptions, tracks: [baseTrack]})

  await saveCustomAlbum({
    ...albumOptions,
    albumId,
    tracks: [{...baseTrack, title: 'Renamed title'}],
  })

  const draft = await readCustomAlbumDraft({albumId})
  const albums = await readCustomAlbums()

  expect(draft?.tracks[0]?.title).toBe('Renamed title')
  expect(albums[0]?.tracks[0]?.title).toBe('Renamed title')
})
