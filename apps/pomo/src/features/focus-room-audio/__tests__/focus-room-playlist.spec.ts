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

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/audio/tracks.json', {
      cache: 'no-store',
      signal: undefined,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/audio/playlist.json', {
      cache: 'no-store',
      signal: undefined,
    })
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

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/audio/tracks.json', {
      cache: 'no-store',
      signal: undefined,
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/audio/albums.json', {
      cache: 'no-store',
      signal: undefined,
    })
    return expect(result).resolves.toEqual([
      {...albums[0], tracks: [TRACKS[1], TRACKS[0]]},
      {...albums[1], tracks: []},
    ])
  })

  it('should merge a published album without a product as sale preparation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
      .mockResolvedValueOnce(createJsonResponse({albums: [], version: 1}))
      .mockResolvedValueOnce(
        createJsonResponse({
          albums: [
            {
              coverFallback: 'lp',
              coverImageUrl: 'https://storage.pomofi.io/first.webp',
              description: '곧 판매할 앨범',
              id: 'paid-album-id',
              sale: {state: 'preparing'},
              title: '유료 앨범',
              trackCount: 2,
              tracks: [
                {artist: '첫 가수', id: 'paid-one', title: '첫 유료곡'},
                {artist: '둘째 가수', id: 'paid-two', title: '둘째 유료곡'},
              ],
            },
          ],
          version: 1,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadPAlbums()).resolves.toEqual([
      {
        coverImageUrl: 'https://storage.pomofi.io/first.webp',
        description: '곧 판매할 앨범',
        icon: 'i-tabler-vinyl',
        id: 'paid-album-id',
        sale: {state: 'preparing', statusLabel: '판매 준비중'},
        title: '유료 앨범',
        trackCount: 2,
        trackIds: [],
        trackListings: [
          {artist: '첫 가수', id: 'paid-one', title: '첫 유료곡'},
          {artist: '둘째 가수', id: 'paid-two', title: '둘째 유료곡'},
        ],
        tracks: [],
      },
    ])
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/music/albums', {
      cache: 'no-store',
      signal: undefined,
    })
  })

  it('should preserve bundled albums when the published catalog is unavailable', async () => {
    const album = {
      description: '기본 앨범',
      icon: 'i-tabler-music',
      id: 'included',
      title: '기본 음악',
      trackIds: [],
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({albums: [album], version: 1}))
        .mockRejectedValueOnce(new Error('catalog unavailable')),
    )

    await expect(loadPAlbums()).resolves.toEqual([{...album, tracks: []}])
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
