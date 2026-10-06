/** @vitest-environment jsdom */

import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  albumByteLimit: 1000,
}))

vi.mock('src/features/custom-albums/model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/custom-albums/model')>()
  return {
    ...actual,
    MAXIMUM_CUSTOM_ALBUM_BYTES: mocks.albumByteLimit,
  }
})

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

it('should reject oversized track-plus-cover albums before opening IndexedDB', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

  const database = await import('src/features/custom-albums/database')
  const openSpy = vi.spyOn(database, 'openCustomAlbumDatabase')
  const {CustomAlbumError, saveCustomAlbum} = await import('src/features/custom-albums')
  const trackBytes = mocks.albumByteLimit - 100
  const coverBytes = 200
  const audio = new Blob([new Uint8Array(trackBytes)], {type: 'audio/mpeg'})
  const coverImage = new Blob([new Uint8Array(coverBytes)], {type: 'image/webp'})

  await expect(
    saveCustomAlbum({
      albumId: null,
      artist: 'Artist',
      coverIcon: 'disc',
      coverImage: {image: coverImage, kind: 'replace'},
      coverSource: 'manual',
      title: 'Album',
      tracks: [
        {
          audio,
          durationSeconds: 60,
          fileName: 'song.mp3',
          id: 'custom-track:track-1',
          title: 'Track',
        },
      ],
    }),
  ).rejects.toSatisfy(
    (error: unknown) => error instanceof CustomAlbumError && error.code === 'album-too-large',
  )

  expect(openSpy).not.toHaveBeenCalled()
})
