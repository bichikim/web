/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

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

beforeEach(async () => {
  await import('src/features/custom-albums')
})

afterEach(async () => {
  try {
    await resetAlbumDatabase()
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

const stubAudioMetadata = (durationSeconds: number): void => {
  vi.stubGlobal('document', {
    createElement: (tagName: string) => {
      if (tagName !== 'audio') {
        throw new Error(`Unexpected element: ${tagName}`)
      }

      let loadedMetadataListener: (() => void) | undefined

      return {
        addEventListener: (eventName: string, listener: () => void) => {
          if (eventName === 'loadedmetadata') {
            loadedMetadataListener = listener
          }
        },
        duration: durationSeconds,
        load: () => {
          queueMicrotask(() => loadedMetadataListener?.())
        },
        preload: '',
        removeAttribute: vi.fn(),
        removeEventListener: vi.fn(),
      }
    },
  } as unknown as Document)
  vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => undefined)
}

const seedCustomAlbum = async (trackTitle: string, audio: Blob) => {
  const albumId = 'custom-album:album-1'
  const trackId = 'custom-track:track-1'
  const albumOptions = {
    albumId: null,
    artist: 'Artist',
    coverIcon: 'disc' as const,
    coverImage: {kind: 'keep' as const},
    coverSource: 'automatic' as const,
    title: 'Album',
  }
  const {ALBUM_STORE_NAME, TRACK_STORE_NAME, openCustomAlbumDatabase, waitForTransaction} =
    await import('src/features/custom-albums/database')
  const database = await openCustomAlbumDatabase()
  const transaction = database.transaction([ALBUM_STORE_NAME, TRACK_STORE_NAME], 'readwrite')
  const finished = waitForTransaction(transaction)
  const now = Date.now()

  transaction.objectStore(ALBUM_STORE_NAME).put({
    artist: albumOptions.artist,
    coverIcon: albumOptions.coverIcon,
    coverSource: albumOptions.coverSource,
    createdAt: now,
    id: albumId,
    title: albumOptions.title,
    trackIds: [trackId],
    updatedAt: now,
  })
  transaction.objectStore(TRACK_STORE_NAME).put({
    albumId,
    artist: albumOptions.artist,
    audio,
    durationSeconds: 60,
    fileName: 'song.mp3',
    id: trackId,
    title: trackTitle,
  })

  await finished

  return {
    albumId,
    albumOptions,
    track: {
      audio,
      durationSeconds: 60,
      fileName: 'song.mp3',
      id: trackId,
      title: trackTitle,
    },
  }
}

it('should persist a changed track title when re-saving a custom album', async () => {
  const {albumId, albumOptions, track} = await seedCustomAlbum(
    'Original title',
    new Blob(['audio'], {type: 'audio/mpeg'}),
  )
  const {readCustomAlbumDraft, readCustomAlbums, saveCustomAlbum} =
    await import('src/features/custom-albums')

  await saveCustomAlbum({
    ...albumOptions,
    albumId,
    tracks: [{...track, title: 'Renamed title'}],
  })

  const draft = await readCustomAlbumDraft({albumId})
  const albums = await readCustomAlbums()

  expect(draft?.tracks[0]?.title).toBe('Renamed title')
  expect(albums[0]?.tracks[0]?.title).toBe('Renamed title')
})

it('should persist replaced track audio when re-saving with the same title and artist', async () => {
  const {albumId, albumOptions, track} = await seedCustomAlbum(
    'Same title',
    new Blob(['audio-a'], {type: 'audio/mpeg'}),
  )
  const {readCustomAlbumDraft, saveCustomAlbum} = await import('src/features/custom-albums')

  await saveCustomAlbum({
    ...albumOptions,
    albumId,
    tracks: [{...track, audio: new Blob(['audio-b'], {type: 'audio/mpeg'})}],
  })

  const draft = await readCustomAlbumDraft({albumId})
  const audioText = draft === null ? null : await draft.tracks[0]?.audio.text()

  expect(audioText).toBe('audio-b')
})

it('should persist changed track metadata when re-saving with the same title and artist', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

  const {readCustomAlbumDraft, saveCustomAlbum} = await import('src/features/custom-albums')
  const baseTrack = {
    audio: new Blob(['audio'], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'song.mp3',
    id: 'custom-track:track-1',
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
    tracks: [{...baseTrack, durationSeconds: 90, fileName: 'remastered.mp3'}],
  })

  const draft = await readCustomAlbumDraft({albumId})

  expect(draft?.tracks[0]?.durationSeconds).toBe(90)
  expect(draft?.tracks[0]?.fileName).toBe('remastered.mp3')
})

it('should count replaced track bytes against the existing audio quota', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })
  vi.stubGlobal('navigator', {
    storage: {
      estimate: vi
        .fn()
        .mockResolvedValueOnce({quota: 100, usage: 93})
        .mockResolvedValueOnce({quota: 100, usage: 98}),
    },
  })

  const {readCustomAlbumDraft, saveCustomAlbum} = await import('src/features/custom-albums')
  const baseTrack = {
    audio: new Blob(['audio-a'], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'song.mp3',
    id: 'custom-track:track-1',
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
    tracks: [{...baseTrack, audio: new Blob(['audio-new'], {type: 'audio/mpeg'})}],
  })

  const draft = await readCustomAlbumDraft({albumId})
  const audioText = draft === null ? null : await draft.tracks[0]?.audio.text()

  expect(audioText).toBe('audio-new')
})

it('should reject a track replacement when available quota only covers the existing audio', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })
  vi.stubGlobal('navigator', {
    storage: {
      estimate: vi
        .fn()
        .mockResolvedValueOnce({quota: 100, usage: 93})
        .mockResolvedValueOnce({quota: 100, usage: 99}),
    },
  })

  const {readCustomAlbumDraft, saveCustomAlbum} = await import('src/features/custom-albums')
  const baseTrack = {
    audio: new Blob(['audio-a'], {type: 'audio/mpeg'}),
    durationSeconds: 60,
    fileName: 'song.mp3',
    id: 'custom-track:track-1',
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
  const savePromise = saveCustomAlbum({
    ...albumOptions,
    albumId,
    tracks: [{...baseTrack, audio: new Blob(['audio-new'], {type: 'audio/mpeg'})}],
  })

  await expect(savePromise).rejects.toMatchObject({code: 'quota-exceeded'})

  const draft = await readCustomAlbumDraft({albumId})
  const audioText = draft === null ? null : await draft.tracks[0]?.audio.text()

  expect(audioText).toBe('audio-a')
})

it('should reject audio whose rounded duration would be zero as invalid audio', async () => {
  stubAudioMetadata(0.499)
  vi.stubGlobal('crypto', {randomUUID: () => 'track-1'})

  const {addCustomAlbumTracks} = await import('src/features/custom-albums')
  const file = new File([new Uint8Array(32)], 'short.mp3', {type: 'audio/mpeg'})

  await expect(
    addCustomAlbumTracks({
      currentAlbumBytes: 0,
      currentTrackCount: 0,
      files: [file],
      readEmbeddedCover: false,
    }),
  ).rejects.toMatchObject({code: 'invalid-audio'})
})

it('should persist audio that rounds to one second', async () => {
  stubAudioMetadata(0.5)
  vi.stubGlobal('crypto', {randomUUID: () => 'track-1'})

  const {addCustomAlbumTracks, readCustomAlbumDraft, saveCustomAlbum} =
    await import('src/features/custom-albums')
  const file = new File([new Uint8Array(32)], 'short.mp3', {type: 'audio/mpeg'})
  const result = await addCustomAlbumTracks({
    currentAlbumBytes: 0,
    currentTrackCount: 0,
    files: [file],
    readEmbeddedCover: false,
  })

  expect(result.kind).toBe('added')
  if (result.kind !== 'added') {
    throw new Error('Expected the supported audio file to be added.')
  }
  expect(result.tracks[0]?.durationSeconds).toBe(1)

  const albumId = await saveCustomAlbum({
    albumId: null,
    artist: 'Artist',
    coverIcon: 'disc',
    coverImage: {kind: 'keep'},
    coverSource: 'automatic',
    title: 'Album',
    tracks: result.tracks,
  })
  const draft = await readCustomAlbumDraft({albumId})

  expect(draft?.tracks[0]?.durationSeconds).toBe(1)
})
