import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  findEntitledTrackPlaybackAsset,
  findPublishedTrackPreviewAsset,
  listPublishedAlbums,
} from '../catalog-repository'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn()}))

vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')

  return {...actual, getDatabase: databaseMocks.getDatabase}
})

const select = vi.fn()
const database = {select}

const createAssetQuery = (result: ReadonlyArray<unknown>, joinCount: 2 | 3) => ({
  from: vi.fn(() => {
    const where = vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)}))

    if (joinCount === 2) {
      return {innerJoin: vi.fn(() => ({innerJoin: vi.fn(() => ({where}))}))}
    }

    return {
      innerJoin: vi.fn(() => ({
        innerJoin: vi.fn(() => ({innerJoin: vi.fn(() => ({where}))})),
      })),
    }
  }),
})

const createAlbumQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({
      where: vi.fn(() => ({orderBy: vi.fn().mockResolvedValue(result)})),
    })),
  })),
})

const createTrackQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({orderBy: vi.fn().mockResolvedValue(result)})),
        })),
      })),
    })),
  })),
})

const createOfferQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({
      innerJoin: vi.fn(() => ({
        innerJoin: vi.fn(() => ({where: vi.fn().mockResolvedValue(result)})),
      })),
    })),
  })),
})

const queueCatalog = (
  translations: ReadonlyArray<unknown>,
  tracks: ReadonlyArray<unknown>,
  offers: ReadonlyArray<unknown>,
) => {
  select
    .mockReturnValueOnce(createAlbumQuery(translations))
    .mockReturnValueOnce(createTrackQuery(tracks))
    .mockReturnValueOnce(createOfferQuery(offers))
}

beforeEach(() => {
  vi.clearAllMocks()
  select.mockReset()
  databaseMocks.getDatabase.mockReturnValue(database)
})

describe('findPublishedTrackPreviewAsset', () => {
  it('should return an active published track asset', async () => {
    select.mockReturnValueOnce(
      createAssetQuery(
        [{assetId: 'asset-1', durationMs: 1234, objectKey: 'tracks/asset-1/source.mp3'}],
        2,
      ),
    )

    await expect(findPublishedTrackPreviewAsset('track-1')).resolves.toEqual({
      assetId: 'asset-1',
      durationMs: 1234,
      objectKey: 'tracks/asset-1/source.mp3',
    })
  })

  it.each([
    ['no matching row', []],
    [
      'an asset whose duration is not ready',
      [{assetId: 'asset-1', durationMs: null, objectKey: 'tracks/asset-1/source.mp3'}],
    ],
  ])('should return null for %s', async (_name, result) => {
    select.mockReturnValueOnce(createAssetQuery(result, 2))

    await expect(findPublishedTrackPreviewAsset('track-1')).resolves.toBeNull()
  })

  it('should propagate a database read failure', async () => {
    select.mockReturnValueOnce({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({limit: vi.fn().mockRejectedValue(new Error('preview failed'))})),
          })),
        })),
      })),
    })

    await expect(findPublishedTrackPreviewAsset('track-1')).rejects.toThrow('preview failed')
  })
})

describe('findEntitledTrackPlaybackAsset', () => {
  it('should return an entitled asset at an explicit access time', async () => {
    select.mockReturnValueOnce(
      createAssetQuery(
        [{assetId: 'asset-1', durationMs: 5678, objectKey: 'tracks/asset-1/source.mp3'}],
        3,
      ),
    )

    await expect(
      findEntitledTrackPlaybackAsset('user-1', 'track-1', new Date('2026-08-26T00:00:00Z')),
    ).resolves.toEqual({
      assetId: 'asset-1',
      durationMs: 5678,
      objectKey: 'tracks/asset-1/source.mp3',
    })
  })

  it.each([
    ['no matching entitlement', []],
    [
      'an asset whose duration is not ready',
      [{assetId: 'asset-1', durationMs: null, objectKey: 'tracks/asset-1/source.mp3'}],
    ],
  ])('should return null for %s using the default access time', async (_name, result) => {
    select.mockReturnValueOnce(createAssetQuery(result, 3))

    await expect(findEntitledTrackPlaybackAsset('user-1', 'track-1')).resolves.toBeNull()
  })

  it('should propagate a database read failure', async () => {
    select.mockReturnValueOnce({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn().mockRejectedValue(new Error('entitlement failed')),
              })),
            })),
          })),
        })),
      })),
    })

    await expect(findEntitledTrackPlaybackAsset('user-1', 'track-1')).rejects.toThrow(
      'entitlement failed',
    )
  })
})

describe('listPublishedAlbums', () => {
  it('should assemble Korean albums, tracks, artwork, and sale states', async () => {
    queueCatalog(
      [
        {
          coverFallback: 'music',
          coverImageUrl: null,
          description: '첫 번째 설명',
          id: 'album-1',
          locale: 'ko',
          publishedAt: new Date('2026-08-26T00:00:00Z'),
          title: '첫 번째',
        },
        {
          coverFallback: 'lp',
          coverImageUrl: 'https://assets.example/album-2.webp',
          description: '두 번째 설명',
          id: 'album-2',
          locale: 'ko',
          publishedAt: new Date('2026-08-25T00:00:00Z'),
          title: '두 번째',
        },
      ],
      [
        {
          albumId: 'album-1',
          artist: 'Artist One',
          artworkUrl: null,
          id: 'track-1',
          title: 'Track One',
        },
        {
          albumId: 'album-1',
          artist: 'Artist Two',
          artworkUrl: 'https://assets.example/track-2.webp',
          id: 'track-2',
          title: 'Track Two',
        },
      ],
      [{albumId: 'album-1', externalProductId: 'product-1'}],
    )

    await expect(listPublishedAlbums()).resolves.toEqual([
      {
        coverFallback: 'music',
        coverImageUrl: null,
        description: '첫 번째 설명',
        id: 'album-1',
        sale: {externalProductId: 'product-1', state: 'configured'},
        title: '첫 번째',
        trackCount: 2,
        tracks: [
          {artist: 'Artist One', artworkUrl: undefined, id: 'track-1', title: 'Track One'},
          {
            artist: 'Artist Two',
            artworkUrl: 'https://assets.example/track-2.webp',
            id: 'track-2',
            title: 'Track Two',
          },
        ],
      },
      {
        coverFallback: 'lp',
        coverImageUrl: 'https://assets.example/album-2.webp',
        description: '두 번째 설명',
        id: 'album-2',
        sale: {state: 'preparing'},
        title: '두 번째',
        trackCount: 0,
        tracks: [],
      },
    ])
  })

  it('should prefer English translations and fall back to Korean', async () => {
    queueCatalog(
      [
        {
          coverFallback: 'cd',
          coverImageUrl: null,
          description: '한국어 설명',
          id: 'album-1',
          locale: 'ko',
          publishedAt: new Date('2026-08-26T00:00:00Z'),
          title: '한국어 제목',
        },
        {
          coverFallback: 'cd',
          coverImageUrl: null,
          description: 'English description',
          id: 'album-1',
          locale: 'en',
          publishedAt: new Date('2026-08-26T00:00:00Z'),
          title: 'English title',
        },
        {
          coverFallback: 'music',
          coverImageUrl: null,
          description: 'Fallback description',
          id: 'album-2',
          locale: 'ko',
          publishedAt: new Date('2026-08-25T00:00:00Z'),
          title: 'Fallback title',
        },
        {
          coverFallback: 'cd',
          coverImageUrl: null,
          description: 'Ignored Korean duplicate',
          id: 'album-1',
          locale: 'ko',
          publishedAt: new Date('2026-08-26T00:00:00Z'),
          title: 'Ignored Korean duplicate',
        },
      ],
      [],
      [],
    )

    const albums = await listPublishedAlbums('en')

    expect(albums.map(({id, title}) => ({id, title}))).toEqual([
      {id: 'album-1', title: 'English title'},
      {id: 'album-2', title: 'Fallback title'},
    ])
  })

  it('should return an empty catalog for empty database results', async () => {
    queueCatalog([], [], [])

    await expect(listPublishedAlbums()).resolves.toEqual([])
  })

  it('should propagate a database read failure', async () => {
    select
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              orderBy: vi.fn().mockRejectedValue(new Error('catalog failed')),
            })),
          })),
        })),
      })
      .mockReturnValueOnce(createTrackQuery([]))
      .mockReturnValueOnce(createOfferQuery([]))

    await expect(listPublishedAlbums()).rejects.toThrow('catalog failed')
  })
})
