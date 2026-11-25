/** @vitest-environment node */
import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'
import * as database from 'src/features/custom-albums/database'
import {CustomAlbumError, readCustomAlbumDraft, saveCustomAlbum} from 'src/features/custom-albums'

import {clearCustomAlbumDatabase} from './support/clear-database'

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

afterEach(async () => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  await clearCustomAlbumDatabase()
})

it('should reject oversized track-plus-cover albums before opening IndexedDB', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

  const openSpy = vi.spyOn(database, 'openCustomAlbumDatabase')
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

it('should validate kept cover size in the album transaction and preserve the original', async () => {
  const options = {
    artist: 'Artist',
    coverIcon: 'disc',
    coverSource: 'manual',
    title: 'Album',
  } as const
  const track = {
    audio: new Blob([new Uint8Array(600)], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'song.mp3',
    id: 'custom-track:kept-cover',
    title: 'Track',
  }
  const cover = new Blob([new Uint8Array(300)], {type: 'image/webp'})
  const albumId = await saveCustomAlbum({
    ...options,
    albumId: null,
    coverImage: {image: cover, kind: 'replace'},
    tracks: [track],
  })

  const oversized = new Blob([new Uint8Array(750)], {type: 'audio/mpeg'})
  await expect(
    saveCustomAlbum({
      ...options,
      albumId,
      coverImage: {kind: 'keep'},
      tracks: [{...track, audio: oversized}],
    }),
  ).rejects.toMatchObject({code: 'album-too-large'})

  const retained = await readCustomAlbumDraft({albumId})
  expect(retained?.coverImage?.size).toBe(cover.size)
  expect(retained?.tracks[0]?.audio.size).toBe(track.audio.size)
})
