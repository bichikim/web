import {afterEach, describe, expect, it, vi} from 'vitest'

import {loadPAlbums, loadPTracks} from '../focus-room-playlist'

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 2, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

const createJsonResponse = (value: unknown) => ({
  json: () => Promise.resolve(value),
  ok: true,
  status: 200,
})

describe('loadPTracks', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('should resolve playlist IDs against the track catalog in playlist order', () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
      .mockResolvedValueOnce(createJsonResponse({trackIds: ['two', 'one'], version: 1}))
    vi.stubGlobal('fetch', fetchMock)

    const result = loadPTracks()

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/audio/tracks.json',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/audio/playlist.json',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
    return expect(result).resolves.toEqual([TRACKS[1], TRACKS[0]])
  })

  it('should reject playlist IDs missing from the track catalog', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: ['missing'], version: 1})),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room playlist references unknown tracks')
  })

  it('should reject duplicate track IDs in the catalog', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: [TRACKS[0], TRACKS[0]], version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: ['one'], version: 1})),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room tracks have an invalid format')
  })

  it('should reject duplicate track IDs in the playlist', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: ['one', 'one'], version: 1})),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room playlist has an invalid format')
  })
})

describe('loadPAlbums', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('should resolve album track IDs and preserve albums without tracks', () => {
    const albums = [
      {
        description: '첫 앨범',
        icon: 'i-tabler-sun',
        id: 'first',
        title: '첫 번째',
        trackIds: ['two', 'one'],
      },
      {
        description: '빈 앨범',
        icon: 'i-tabler-moon',
        id: 'empty',
        title: '두 번째',
        trackIds: [],
      },
    ] as const
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
      .mockResolvedValueOnce(createJsonResponse({albums, version: 1}))
    vi.stubGlobal('fetch', fetchMock)

    const result = loadPAlbums()

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/audio/tracks.json',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/audio/albums.json',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
    return expect(result).resolves.toEqual([
      {...albums[0], tracks: [TRACKS[1], TRACKS[0]]},
      {...albums[1], tracks: []},
    ])
  })

  it('should reject album IDs missing from the track catalog', () => {
    const albums = [
      {
        description: '잘못된 앨범',
        icon: 'i-tabler-sun',
        id: 'invalid',
        title: '잘못된 앨범',
        trackIds: ['missing'],
      },
    ] as const
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({albums, version: 1})),
    )

    return expect(loadPAlbums()).rejects.toThrow('Focus-room albums reference unknown tracks')
  })

  it('should reject duplicate album IDs', () => {
    const album = {
      description: '중복 앨범',
      icon: 'i-tabler-music',
      id: 'duplicate',
      title: '중복',
      trackIds: [],
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({albums: [album, album], version: 1})),
    )

    return expect(loadPAlbums()).rejects.toThrow('Focus-room albums have an invalid format')
  })
})
