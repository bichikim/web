import {afterEach, describe, expect, it, vi} from 'vitest'

import {loadPAlbums, loadPTrackQueueSource, loadPTracks} from '../focus-room-playlist'

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 2, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

const createJsonResponse = (value: unknown) => ({
  json: () => Promise.resolve(value),
  ok: true,
  status: 200,
})

const createErrorResponse = (status: number) => ({
  json: () => Promise.resolve(null),
  ok: false,
  status,
})

const createPublishedAlbum = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  coverFallback: 'lp',
  coverImageUrl: null,
  description: '공개 앨범',
  id: 'published-album',
  sale: {state: 'preparing'},
  title: '공개 음악',
  trackCount: 0,
  tracks: [],
  ...overrides,
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('loadPTracks', () => {
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

  it('should expose the complete catalog when the default playlist is a subset', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: ['two'], version: 1})),
    )

    return expect(loadPTrackQueueSource()).resolves.toEqual({
      defaultTracks: [TRACKS[1]],
      tracks: TRACKS,
    })
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

  it('should return an empty selection for an empty playlist', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
        .mockResolvedValueOnce(createJsonResponse({trackIds: [], version: 1})),
    )

    return expect(loadPTracks()).resolves.toEqual([])
  })

  it('should use override URLs, the supplied signal, and production cache policy', async () => {
    const signal = new AbortController().signal
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
      .mockResolvedValueOnce(createJsonResponse({trackIds: [], version: 1}))
    vi.stubEnv('DEV', false)
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      loadPTracks({
        playlistUrl: 'https://pomo.test/playlist.json',
        signal,
        tracksUrl: 'https://pomo.test/tracks.json',
      }),
    ).resolves.toEqual([])
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://pomo.test/tracks.json',
      expect.objectContaining({cache: 'default', signal}),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://pomo.test/playlist.json',
      expect.objectContaining({cache: 'default', signal}),
    )
  })

  it.each([
    {
      responses: [createErrorResponse(400), createJsonResponse({trackIds: [], version: 1})],
      status: 400,
      type: 'tracks',
    },
    {
      responses: [createJsonResponse({tracks: [], version: 1}), createErrorResponse(404)],
      status: 404,
      type: 'playlist',
    },
  ])('should reject a failed $type request', async ({responses, status, type}) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(responses[0]).mockResolvedValueOnce(responses[1]),
    )

    await expect(loadPTracks()).rejects.toThrow(`Focus-room ${type} request failed: ${status}`)
  })

  it.each([
    {collection: null, label: 'null track collection'},
    {collection: {tracks: [null], version: 1}, label: 'null track'},
  ])('should reject a $label', ({collection}) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse(collection))
        .mockResolvedValueOnce(createJsonResponse({trackIds: [], version: 1})),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room tracks have an invalid format')
  })

  it('should reject a null playlist', () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
        .mockResolvedValueOnce(createJsonResponse(null)),
    )

    return expect(loadPTracks()).rejects.toThrow('Focus-room playlist has an invalid format')
  })

  it('should propagate a catalog JSON read failure', () => {
    const jsonError = new Error('invalid JSON')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce({json: () => Promise.reject(jsonError), ok: true, status: 200})
        .mockResolvedValueOnce(createJsonResponse({trackIds: [], version: 1})),
    )

    return expect(loadPTracks()).rejects.toBe(jsonError)
  })
})

describe('loadPAlbums', () => {
  it('should resolve album track IDs and preserve albums without tracks', () => {
    const albums = [
      {
        coverImageUrl: '/audio/artwork/first.jpg',
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
    const tracks = [{...TRACKS[0], artworkUrl: '/audio/artwork/one.jpg'}, TRACKS[1]] as const
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks, version: 1}))
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
      {
        ...albums[0],
        tracks: [{...tracks[1], artworkUrl: '/audio/artwork/first.jpg'}, tracks[0]],
      },
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
                {
                  artist: '첫 가수',
                  artworkUrl: 'https://storage.pomofi.io/track-artwork/paid-one/cover',
                  id: 'paid-one',
                  title: '첫 유료곡',
                },
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
          {
            artist: '첫 가수',
            artworkUrl: 'https://storage.pomofi.io/track-artwork/paid-one/cover',
            id: 'paid-one',
            title: '첫 유료곡',
          },
          {artist: '둘째 가수', id: 'paid-two', title: '둘째 유료곡'},
        ],
        tracks: [],
      },
    ])
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/music/albums',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
  })

  it('should localize bundled and published albums for English', async () => {
    const bundledAlbum = {
      description: '한국어 설명',
      icon: 'i-tabler-sunrise',
      id: 'morning-focus',
      title: '아침의 카페',
      trackIds: [],
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
      .mockResolvedValueOnce(createJsonResponse({albums: [bundledAlbum], version: 1}))
      .mockResolvedValueOnce(
        createJsonResponse({
          albums: [
            {
              coverFallback: 'music',
              coverImageUrl: null,
              description: 'Published description',
              id: 'published',
              sale: {state: 'preparing'},
              title: 'Published album',
              trackCount: 0,
              tracks: [],
            },
          ],
          version: 1,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadPAlbums({locale: 'en'})).resolves.toEqual([
      {
        ...bundledAlbum,
        description: 'Start focusing with bright, clear rhythms.',
        title: 'Morning Café',
        tracks: [],
      },
      expect.objectContaining({
        description: 'Published description',
        sale: {state: 'preparing', statusLabel: 'Preparing for sale'},
        title: 'Published album',
      }),
    ])
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/music/albums?locale=en',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
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

  it('should preserve an override URL query when requesting a localized catalog', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: TRACKS, version: 1}))
      .mockResolvedValueOnce(createJsonResponse({albums: [], version: 1}))
      .mockResolvedValueOnce(createJsonResponse({albums: [], version: 1}))
    vi.stubGlobal('fetch', fetchMock)

    await loadPAlbums({
      locale: 'en',
      publishedAlbumsUrl: 'https://pomo.test/albums?channel=toss',
    })

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'https://pomo.test/albums?channel=toss&locale=en',
      expect.objectContaining({cache: 'no-store', signal: undefined}),
    )
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

  it('should map a configured published CD album and its connected sale status', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
      .mockResolvedValueOnce(createJsonResponse({albums: [], version: 1}))
      .mockResolvedValueOnce(
        createJsonResponse({
          albums: [
            createPublishedAlbum({
              coverFallback: 'cd',
              sale: {externalProductId: 'product-id', state: 'configured'},
            }),
          ],
          version: 1,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(loadPAlbums()).resolves.toEqual([
      expect.objectContaining({
        coverImageUrl: undefined,
        icon: 'i-tabler-disc',
        sale: {
          priceLabel: '[가격 확인]',
          state: 'configured',
          statusLabel: '상품 연결됨',
        },
      }),
    ])
  })

  it('should localize every bundled album identifier in catalog order', async () => {
    const ids = ['cafe-focus', 'tension-focus', 'happy-detour', 'quiet-pages'] as const
    const albums = ids.map((id) => ({
      description: `original-${id}`,
      icon: 'i-tabler-music',
      id,
      title: `original-${id}`,
      trackIds: [],
    }))
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
        .mockResolvedValueOnce(createJsonResponse({albums, version: 1}))
        .mockResolvedValueOnce(createJsonResponse({albums: [], version: 1})),
    )

    const result = await loadPAlbums()

    expect(result.map((album) => album.id)).toEqual(ids)
    result.forEach((album) => {
      expect(album.title).not.toBe(`original-${album.id}`)
      expect(album.description).not.toBe(`original-${album.id}`)
    })
  })

  it.each([
    {
      responses: [createErrorResponse(400), createJsonResponse({albums: [], version: 1})],
      status: 400,
      type: 'tracks',
    },
    {
      responses: [createJsonResponse({tracks: [], version: 1}), createErrorResponse(401)],
      status: 401,
      type: 'albums',
    },
  ])('should reject a failed album $type request', async ({responses, status, type}) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(responses[0]).mockResolvedValueOnce(responses[1]),
    )

    await expect(loadPAlbums()).rejects.toThrow(`Focus-room ${type} request failed: ${status}`)
  })

  it.each([
    {
      collection: null,
      expected: 'Focus-room tracks have an invalid format',
      label: 'null track collection',
    },
    {
      collection: {tracks: [], version: 1},
      expected: 'Focus-room albums have an invalid format',
      label: 'null album collection',
      secondCollection: null,
    },
    {
      collection: {tracks: [], version: 1},
      expected: 'Focus-room albums have an invalid format',
      label: 'null album',
      secondCollection: {albums: [null], version: 1},
    },
  ])(
    'should reject a $label',
    ({collection, expected, secondCollection = {albums: [], version: 1}}) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce(createJsonResponse(collection))
          .mockResolvedValueOnce(createJsonResponse(secondCollection)),
      )

      return expect(loadPAlbums()).rejects.toThrow(expected)
    },
  )

  it('should preserve bundled albums when the published request is not successful', async () => {
    const publishedJson = vi.fn()
    const album = {
      description: '기본 앨범',
      icon: 'i-tabler-music',
      id: 'bundled',
      title: '기본 음악',
      trackIds: [],
    }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
        .mockResolvedValueOnce(createJsonResponse({albums: [album], version: 1}))
        .mockResolvedValueOnce({json: publishedJson, ok: false, status: 404}),
    )

    await expect(loadPAlbums()).resolves.toEqual([{...album, tracks: []}])
    expect(publishedJson).not.toHaveBeenCalled()
  })

  it.each([
    {collection: null, label: 'null collection'},
    {collection: {albums: [null], version: 1}, label: 'null album'},
    {
      collection: {albums: [createPublishedAlbum({sale: null})], version: 1},
      label: 'null sale',
    },
    {
      collection: {
        albums: [createPublishedAlbum({trackCount: 1, tracks: [null]})],
        version: 1,
      },
      label: 'null track listing',
    },
  ])('should ignore a published $label', async ({collection}) => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(createJsonResponse({tracks: [], version: 1}))
        .mockResolvedValueOnce(createJsonResponse({albums: [], version: 1}))
        .mockResolvedValueOnce(createJsonResponse(collection)),
    )

    await expect(loadPAlbums()).resolves.toEqual([])
  })
})
