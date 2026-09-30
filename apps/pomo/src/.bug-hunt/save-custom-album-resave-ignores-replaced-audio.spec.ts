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

it('should persist replaced track audio when re-saving with the same title and artist', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

  const {readCustomAlbumDraft, saveCustomAlbum} = await import('src/features/custom-albums')
  const trackId = 'custom-track:track-1'
  const baseTrack = {
    audio: new Blob(['audio-a'], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'song.mp3',
    id: trackId,
    title: 'Same title',
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
    tracks: [{...baseTrack, audio: new Blob(['audio-b'], {type: 'audio/mpeg'})}],
  })

  const draft = await readCustomAlbumDraft({albumId})
  const audioText = draft === null ? null : await draft.tracks[0]?.audio.text()

  expect(audioText).toBe('audio-b')
})
