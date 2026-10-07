import {clearCustomAlbumDatabase, stubCustomAlbumAudioMetadata} from './support'
/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {afterEach, expect, it, vi} from 'vitest'
import {
  addCustomAlbumTracks,
  type CustomAlbumCoverUpdate,
  readCustomAlbumDraft,
  readCustomAlbumLibraryBytes,
  readCustomAlbums,
  saveCustomAlbum,
} from 'src/features/custom-albums'

afterEach(async () => {
  try {
    await clearCustomAlbumDatabase()
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

it.each([
  {availableBytes: 2, cover: 'keep', succeeds: true},
  {availableBytes: 1, cover: 'keep', succeeds: false},
  {availableBytes: 3, cover: 'replace', succeeds: true},
  {availableBytes: 2, cover: 'replace', succeeds: false},
  {availableBytes: 0, cover: 'remove', succeeds: true},
] as const)(
  'should credit removed and replaced audio without crediting a kept cover: $cover/$availableBytes',
  async ({availableBytes, cover, succeeds}) => {
    const albumOptions = {
      artist: 'Artist',
      coverIcon: 'disc' as const,
      coverSource: 'manual' as const,
      title: 'Album',
    }
    const track = {
      audio: new Blob(['1234567'], {type: 'audio/mpeg'}),
      durationSeconds: 60,
      fileName: 'song.mp3',
      id: 'custom-track:kept',
      title: 'Track',
    }
    vi.stubGlobal('navigator', {storage: {estimate: vi.fn().mockResolvedValue({})}})
    const albumId = await saveCustomAlbum({
      ...albumOptions,
      albumId: null,
      coverImage: {image: new Blob(['123'], {type: 'image/webp'}), kind: 'replace'},
      tracks: [track, {...track, audio: new Blob(['12345']), id: 'custom-track:removed'}],
    })
    const replacement = Object.freeze({
      ...track,
      audio: new Blob(['12345678901234'], {type: 'audio/mpeg'}),
    })
    const covers = {
      keep: {kind: 'keep'},
      remove: {image: null, kind: 'replace'},
      replace: {image: new Blob(['1234'], {type: 'image/webp'}), kind: 'replace'},
    } satisfies Record<typeof cover, CustomAlbumCoverUpdate>
    vi.stubGlobal('navigator', {
      storage: {estimate: vi.fn().mockResolvedValue({quota: 100, usage: 100 - availableBytes})},
    })

    const saved = saveCustomAlbum({
      ...albumOptions,
      albumId,
      coverImage: covers[cover],
      tracks: Object.freeze([replacement]),
    })

    if (succeeds) {
      await expect(saved).resolves.toBe(albumId)
      const draft = await readCustomAlbumDraft({albumId})
      expect(draft?.tracks.map(({id}) => id)).toEqual(['custom-track:kept'])
      expect(await draft?.tracks[0]?.audio.text()).toBe('12345678901234')
      expect(draft?.coverImage?.size ?? 0).toBe(
        cover === 'keep' ? 3 : (covers[cover].image?.size ?? 0),
      )
    } else {
      await expect(saved).rejects.toMatchObject({code: 'quota-exceeded'})
      const draft = await readCustomAlbumDraft({albumId})
      expect(draft?.tracks.map(({id}) => id)).toEqual(['custom-track:kept', 'custom-track:removed'])
      expect(await draft?.tracks[0]?.audio.text()).toBe('1234567')
      expect(draft?.coverImage?.size).toBe(3)
      await expect(readCustomAlbumLibraryBytes({excludedAlbumId: null})).resolves.toBe(15)
    }
  },
)

it('should persist a changed track title when re-saving a custom album', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

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

it('should persist replaced track audio when re-saving with the same title and artist', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

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

it('should persist changed track metadata when re-saving with the same title and artist', async () => {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'custom-album:album-1',
  })

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
  stubCustomAlbumAudioMetadata({deferLoad: true, durationSeconds: 0.499})
  vi.stubGlobal('crypto', {randomUUID: () => 'track-1'})

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
  stubCustomAlbumAudioMetadata({deferLoad: true, durationSeconds: 0.5})
  vi.stubGlobal('crypto', {randomUUID: () => 'track-1'})

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
