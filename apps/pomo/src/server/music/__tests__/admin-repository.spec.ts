import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  connectAlbumOffer,
  createAlbum,
  listAdminMusic,
  updateAlbumStatus,
} from '../admin-repository'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn(), withTransactionalDatabase: vi.fn()}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')
  return {...actual, ...databaseMocks}
})

const readSelect = vi.fn()
const transactionSelect = vi.fn()
const transactionInsert = vi.fn()
const transactionUpdate = vi.fn()
const transactionDelete = vi.fn()
const transaction = {
  delete: transactionDelete,
  insert: transactionInsert,
  select: transactionSelect,
  update: transactionUpdate,
}
const transactionalDatabase = {
  transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<unknown>) =>
    operation(transaction),
  ),
}

const createOrderedQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({orderBy: vi.fn().mockResolvedValue(result)})),
})

const createJoinedOrderedQuery = (result: ReadonlyArray<unknown>, joins: 1 | 2) => ({
  from: vi.fn(() => {
    const orderBy = vi.fn().mockResolvedValue(result)
    return joins === 1
      ? {innerJoin: vi.fn(() => ({orderBy}))}
      : {innerJoin: vi.fn(() => ({innerJoin: vi.fn(() => ({orderBy}))}))}
  }),
})

const queueAdminList = (
  albums: ReadonlyArray<unknown>,
  translations: ReadonlyArray<unknown>,
  tracks: ReadonlyArray<unknown>,
  pendingTracks: ReadonlyArray<unknown>,
  assets: ReadonlyArray<unknown>,
  offers: ReadonlyArray<unknown>,
) => {
  readSelect
    .mockReturnValueOnce(createOrderedQuery(albums))
    .mockReturnValueOnce(createOrderedQuery(translations))
    .mockReturnValueOnce(createJoinedOrderedQuery(tracks, 1))
    .mockReturnValueOnce(createJoinedOrderedQuery(pendingTracks, 1))
    .mockReturnValueOnce(createOrderedQuery(assets))
    .mockReturnValueOnce(createJoinedOrderedQuery(offers, 2))
}

const createLockedAlbumQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      for: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
    })),
  })),
})

const createTracksQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    leftJoin: vi.fn(() => ({where: vi.fn().mockResolvedValue(result)})),
  })),
})

const createAlbumProductQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    innerJoin: vi.fn(() => ({
      where: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
    })),
  })),
})

const createOfferQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({where: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)}))})),
})

const createStatusUpdate = () => ({
  set: vi.fn(() => ({where: vi.fn().mockResolvedValue(undefined)})),
})

const createReturningInsert = (result: ReadonlyArray<unknown>) => ({
  values: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
})

const createProductInsert = (result: ReadonlyArray<unknown>) => ({
  values: vi.fn(() => ({
    onConflictDoUpdate: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
  })),
})

const createProductUpdate = (result: ReadonlyArray<unknown>) => ({
  set: vi.fn(() => ({
    where: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
  })),
})

const createProductAlbumInsert = () => ({
  values: vi.fn(() => ({onConflictDoNothing: vi.fn().mockResolvedValue(undefined)})),
})

const createOfferInsert = () => ({
  values: vi.fn(() => ({onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)})),
})

const queueOfferLookups = (
  album: ReadonlyArray<unknown>,
  albumProduct: ReadonlyArray<unknown>,
  offer: ReadonlyArray<unknown>,
) => {
  transactionSelect
    .mockReturnValueOnce(createLockedAlbumQuery(album))
    .mockReturnValueOnce(createAlbumProductQuery(albumProduct))
    .mockReturnValueOnce(createOfferQuery(offer))
}

const offerInput = {
  albumId: 'album-1',
  externalProductId: 'external-product-1',
  provider: 'apps-in-toss' as const,
}

beforeEach(() => {
  vi.clearAllMocks()
  readSelect.mockReset()
  transactionSelect.mockReset()
  transactionInsert.mockReset()
  transactionUpdate.mockReset()
  transactionDelete.mockReset()
  transactionalDatabase.transaction.mockImplementation(async (operation) => operation(transaction))
  databaseMocks.getDatabase.mockReturnValue({select: readSelect})
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(transactionalDatabase),
  )
})

describe('listAdminMusic', () => {
  it('should assemble releases, translations, assets, offers, and tracks', async () => {
    const albums = [
      {coverFallback: 'music', coverImageUrl: null, id: 'album-1', status: 'draft'},
      {coverFallback: 'lp', coverImageUrl: 'cover.webp', id: 'album-2', status: 'published'},
    ]
    const translations = [
      {albumId: 'album-1', description: 'One', locale: 'ko', title: 'Album One'},
      {albumId: 'other', description: 'Other', locale: 'ko', title: 'Other'},
    ]
    const tracks = [
      {albumId: 'album-1', artist: 'Artist', id: 'track-1', position: 0, title: 'One'},
      {albumId: 'album-1', artist: 'Artist', id: 'track-2', position: 1, title: 'Two'},
    ]
    const assets = [
      {id: 'asset-1', status: 'active', trackId: 'track-1'},
      {id: 'asset-2', status: 'pending', trackId: 'track-2'},
    ]
    const pendingTracks = [
      {albumId: 'album-1', artist: 'Pending Artist', id: 'track-3', title: 'Pending'},
    ]
    const offers = [{albumId: 'album-1', externalProductId: 'product-1'}]
    queueAdminList(albums, translations, tracks, pendingTracks, assets, offers)

    await expect(listAdminMusic()).resolves.toEqual({
      albums: [
        {
          ...albums[0],
          release: {blockers: ['tracks_missing_active_asset'], ready: false},
          translations: [translations[0]],
        },
        {
          ...albums[1],
          release: {blockers: [], ready: true},
          translations: [],
        },
      ],
      assets,
      offers,
      pendingTracks,
      tracks,
    })
  })

  it('should return empty collections for an empty database', async () => {
    queueAdminList([], [], [], [], [], [])
    await expect(listAdminMusic()).resolves.toEqual({
      albums: [],
      assets: [],
      offers: [],
      pendingTracks: [],
      tracks: [],
    })
  })

  it('should propagate a database list failure', async () => {
    readSelect
      .mockReturnValueOnce({
        from: vi.fn(() => ({orderBy: vi.fn().mockRejectedValue(new Error('list failed'))})),
      })
      .mockReturnValueOnce(createOrderedQuery([]))
      .mockReturnValueOnce(createJoinedOrderedQuery([], 1))
      .mockReturnValueOnce(createJoinedOrderedQuery([], 1))
      .mockReturnValueOnce(createOrderedQuery([]))
      .mockReturnValueOnce(createJoinedOrderedQuery([], 2))

    await expect(listAdminMusic()).rejects.toThrow('list failed')
  })
})

describe('updateAlbumStatus', () => {
  it('should return album_not_found for a missing album', async () => {
    transactionSelect.mockReturnValueOnce(createLockedAlbumQuery([]))
    await expect(updateAlbumStatus('album-1', 'publish')).resolves.toEqual({
      code: 'album_not_found',
      success: false,
    })
  })

  it('should reject archiving an album that is not published', async () => {
    transactionSelect.mockReturnValueOnce(
      createLockedAlbumQuery([{publishedAt: null, status: 'draft'}]),
    )
    await expect(updateAlbumStatus('album-1', 'archive')).resolves.toEqual({
      code: 'invalid_status_transition',
      success: false,
    })
  })

  it('should archive a published album', async () => {
    transactionSelect.mockReturnValueOnce(
      createLockedAlbumQuery([{publishedAt: new Date(), status: 'published'}]),
    )
    transactionUpdate.mockReturnValueOnce(createStatusUpdate())
    await expect(updateAlbumStatus('album-1', 'archive')).resolves.toEqual({
      status: 'archived',
      success: true,
    })
  })

  it('should reject publishing an already published album', async () => {
    transactionSelect.mockReturnValueOnce(
      createLockedAlbumQuery([{publishedAt: new Date(), status: 'published'}]),
    )
    await expect(updateAlbumStatus('album-1', 'publish')).resolves.toEqual({
      code: 'invalid_status_transition',
      success: false,
    })
  })

  it('should block publishing when any track lacks an active asset', async () => {
    transactionSelect
      .mockReturnValueOnce(createLockedAlbumQuery([{publishedAt: null, status: 'draft'}]))
      .mockReturnValueOnce(
        createTracksQuery([
          {activeAssetTrackId: 'track-1', trackId: 'track-1'},
          {activeAssetTrackId: null, trackId: 'track-2'},
        ]),
      )
    await expect(updateAlbumStatus('album-1', 'publish')).resolves.toEqual({
      blockers: ['tracks_missing_active_asset'],
      code: 'release_blocked',
      success: false,
    })
  })

  it.each([
    ['a new publication timestamp', null],
    ['the existing publication timestamp', new Date('2026-08-01T00:00:00Z')],
  ])('should publish with %s', async (_name, publishedAt) => {
    transactionSelect
      .mockReturnValueOnce(createLockedAlbumQuery([{publishedAt, status: 'draft'}]))
      .mockReturnValueOnce(
        createTracksQuery([
          {activeAssetTrackId: 'track-1', trackId: 'track-1'},
          {activeAssetTrackId: 'track-1', trackId: 'track-1'},
          {activeAssetTrackId: 'track-2', trackId: 'track-2'},
        ]),
      )
    transactionUpdate.mockReturnValueOnce(createStatusUpdate())
    await expect(updateAlbumStatus('album-1', 'publish')).resolves.toEqual({
      status: 'published',
      success: true,
    })
  })

  it('should propagate a transaction failure', async () => {
    transactionalDatabase.transaction.mockRejectedValueOnce(new Error('transaction failed'))
    await expect(updateAlbumStatus('album-1', 'publish')).rejects.toThrow('transaction failed')
  })
})

describe('createAlbum', () => {
  const input = {
    coverDraftId: null,
    coverFallback: 'music' as const,
    coverImageUrl: null,
    coverReservationId: null,
    translations: [{description: 'Description', locale: 'ko' as const, title: 'Title'}],
  }

  it('should create an album and its translations atomically', async () => {
    transactionInsert
      .mockReturnValueOnce(
        createReturningInsert([
          {coverFallback: 'music', coverImageUrl: null, id: 'album-1', status: 'draft'},
        ]),
      )
      .mockReturnValueOnce(
        createReturningInsert([
          {albumId: 'album-1', description: 'Description', locale: 'ko', title: 'Title'},
        ]),
      )
    await expect(createAlbum(input)).resolves.toMatchObject({
      album: {id: 'album-1', translations: [{albumId: 'album-1', locale: 'ko'}]},
      success: true,
    })
  })

  it('should support an album with no translations', async () => {
    transactionInsert
      .mockReturnValueOnce(
        createReturningInsert([
          {coverFallback: 'cd', coverImageUrl: 'cover.webp', id: 'album-1', status: 'draft'},
        ]),
      )
      .mockReturnValueOnce(createReturningInsert([]))
    await expect(
      createAlbum({
        coverDraftId: null,
        coverFallback: 'cd',
        coverImageUrl: 'cover.webp',
        coverReservationId: null,
        translations: [],
      }),
    ).resolves.toMatchObject({album: {id: 'album-1', translations: []}, success: true})
  })

  it('should reject when the album insert returns no row', async () => {
    transactionInsert.mockReturnValueOnce(createReturningInsert([]))
    await expect(createAlbum(input)).rejects.toThrow('Failed to create a music album')
  })

  it('should propagate a transaction failure', async () => {
    transactionalDatabase.transaction.mockRejectedValueOnce(new Error('create failed'))
    await expect(createAlbum(input)).rejects.toThrow('create failed')
  })

  it('should claim a matching pending cover reservation atomically', async () => {
    transactionSelect.mockReturnValueOnce(
      createLockedAlbumQuery([
        {coverImageUrl: 'https://cdn.example/cover.webp', draftId: 'draft-id'},
      ]),
    )
    transactionInsert
      .mockReturnValueOnce(
        createReturningInsert([
          {
            coverFallback: 'music',
            coverImageUrl: 'https://cdn.example/cover.webp',
            id: 'album-1',
            status: 'draft',
          },
        ]),
      )
      .mockReturnValueOnce(createReturningInsert([]))
    const deleteWhere = vi.fn().mockResolvedValue(undefined)
    transactionDelete.mockReturnValue({where: deleteWhere})

    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'draft-id',
        coverImageUrl: 'https://cdn.example/cover.webp',
        coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      }),
    ).resolves.toMatchObject({album: {id: 'album-1'}, success: true})
    expect(deleteWhere).toHaveBeenCalledOnce()
  })

  it('should reject a missing or mismatched cover reservation before album insertion', async () => {
    transactionSelect.mockReturnValueOnce(createLockedAlbumQuery([]))

    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'draft-id',
        coverImageUrl: 'https://cdn.example/cover.webp',
        coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      }),
    ).resolves.toEqual({code: 'cover_reservation_invalid', success: false})
    expect(transactionInsert).not.toHaveBeenCalled()

    transactionSelect.mockReturnValueOnce(
      createLockedAlbumQuery([
        {coverImageUrl: 'https://cdn.example/other.webp', draftId: 'draft-id'},
      ]),
    )
    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'draft-id',
        coverImageUrl: 'https://cdn.example/cover.webp',
        coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      }),
    ).resolves.toEqual({code: 'cover_reservation_invalid', success: false})
    expect(transactionInsert).not.toHaveBeenCalled()

    transactionSelect.mockReturnValueOnce(
      createLockedAlbumQuery([
        {coverImageUrl: 'https://cdn.example/cover.webp', draftId: 'other-draft'},
      ]),
    )
    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'draft-id',
        coverImageUrl: 'https://cdn.example/cover.webp',
        coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      }),
    ).resolves.toEqual({code: 'cover_reservation_invalid', success: false})
    expect(transactionInsert).not.toHaveBeenCalled()
  })

  it('should reject incomplete cover ownership input before a reservation lookup', async () => {
    await expect(createAlbum({...input, coverDraftId: 'draft-id'})).resolves.toEqual({
      code: 'cover_reservation_invalid',
      success: false,
    })
    await expect(
      createAlbum({
        ...input,
        coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      }),
    ).resolves.toEqual({code: 'cover_reservation_invalid', success: false})
    expect(transactionSelect).not.toHaveBeenCalled()
  })
})

describe('connectAlbumOffer', () => {
  it('should return album_not_found for a missing album', async () => {
    transactionSelect.mockReturnValueOnce(createLockedAlbumQuery([]))
    await expect(connectAlbumOffer(offerInput)).resolves.toEqual({
      code: 'album_not_found',
      success: false,
    })
  })

  it('should reject an external product connected to another product', async () => {
    queueOfferLookups([{id: 'album-1'}], [{id: 'product-1'}], [{productId: 'product-2'}])
    await expect(connectAlbumOffer(offerInput)).resolves.toEqual({
      code: 'external_product_conflict',
      success: false,
    })
  })

  it('should create a product and connect a new offer', async () => {
    queueOfferLookups([{id: 'album-1'}], [], [])
    transactionInsert
      .mockReturnValueOnce(createProductInsert([{id: 'product-1'}]))
      .mockReturnValueOnce(createProductAlbumInsert())
      .mockReturnValueOnce(createOfferInsert())
    await expect(connectAlbumOffer(offerInput)).resolves.toEqual({success: true})
  })

  it('should restore an existing product and matching offer', async () => {
    queueOfferLookups([{id: 'album-1'}], [{id: 'product-1'}], [{productId: 'product-1'}])
    transactionUpdate.mockReturnValueOnce(createProductUpdate([{id: 'product-1'}]))
    transactionInsert
      .mockReturnValueOnce(createProductAlbumInsert())
      .mockReturnValueOnce(createOfferInsert())
    await expect(connectAlbumOffer(offerInput)).resolves.toEqual({success: true})
  })

  it('should reject when product creation returns no row', async () => {
    queueOfferLookups([{id: 'album-1'}], [], [])
    transactionInsert.mockReturnValueOnce(createProductInsert([]))
    await expect(connectAlbumOffer(offerInput)).rejects.toThrow(
      'Failed to create or restore a commerce product',
    )
  })

  it('should reject when product restoration returns no row', async () => {
    queueOfferLookups([{id: 'album-1'}], [{id: 'product-1'}], [])
    transactionUpdate.mockReturnValueOnce(createProductUpdate([]))

    await expect(connectAlbumOffer(offerInput)).rejects.toThrow(
      'Failed to create or restore a commerce product',
    )
  })

  it('should propagate a transaction failure', async () => {
    transactionalDatabase.transaction.mockRejectedValueOnce(new Error('offer failed'))
    await expect(connectAlbumOffer(offerInput)).rejects.toThrow('offer failed')
  })
})
