import {beforeEach, describe, expect, it, vi} from 'vitest'

import {createAlbum} from '../admin-repository'

const databaseMocks = vi.hoisted(() => ({withTransactionalDatabase: vi.fn()}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')
  return {...actual, ...databaseMocks}
})

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

const createLockedAlbumQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      for: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
    })),
  })),
})

const createAlbumQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
  })),
})

const createAlbumTranslationsQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({where: vi.fn().mockResolvedValue(result)})),
})

const createReturningInsert = (result: ReadonlyArray<unknown>) => {
  const returning = vi.fn().mockResolvedValue(result)
  return {
    values: vi.fn(() => ({
      onConflictDoNothing: vi.fn(() => ({returning})),
      returning,
    })),
  }
}

const albumId = '00000000-0000-4000-8000-000000000002'
const input = {
  coverDraftId: null,
  coverFallback: 'music' as const,
  coverImageUrl: null,
  coverReservationId: null,
  id: albumId,
  translations: [{description: 'Description', locale: 'ko' as const, title: 'Title'}],
}

beforeEach(() => {
  vi.clearAllMocks()
  transactionSelect.mockReset()
  transactionInsert.mockReset()
  transactionUpdate.mockReset()
  transactionDelete.mockReset()
  transactionalDatabase.transaction.mockImplementation(async (operation) => operation(transaction))
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(transactionalDatabase),
  )
})

describe('createAlbum', () => {
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
      createAlbum({...input, coverFallback: 'cd', coverImageUrl: 'cover.webp', translations: []}),
    ).resolves.toMatchObject({album: {id: 'album-1', translations: []}, success: true})
  })

  it('should reject when the album insert returns no row', async () => {
    transactionInsert.mockReturnValueOnce(createReturningInsert([]))
    transactionSelect.mockReturnValueOnce(createAlbumQuery([]))
    await expect(createAlbum(input)).rejects.toThrow('Failed to create a music album')
  })

  it('should return an existing album when the same creation ID is retried', async () => {
    transactionInsert.mockReturnValueOnce(createReturningInsert([]))
    transactionSelect
      .mockReturnValueOnce(
        createAlbumQuery([
          {
            coverDraftId: null,
            coverFallback: 'music',
            coverImageUrl: null,
            id: albumId,
            status: 'draft',
          },
        ]),
      )
      .mockReturnValueOnce(
        createAlbumTranslationsQuery([
          {albumId, description: 'Description', locale: 'ko', title: 'Title'},
        ]),
      )

    await expect(createAlbum(input)).resolves.toMatchObject({
      album: {id: albumId, translations: [{albumId, locale: 'ko'}]},
      success: true,
    })
    expect(transactionInsert).toHaveBeenCalledOnce()
  })

  it('should reject when the same creation ID is retried with different metadata', async () => {
    transactionInsert.mockReturnValueOnce(createReturningInsert([]))
    transactionSelect
      .mockReturnValueOnce(
        createAlbumQuery([
          {
            coverDraftId: null,
            coverFallback: 'music',
            coverImageUrl: null,
            id: albumId,
            status: 'draft',
          },
        ]),
      )
      .mockReturnValueOnce(
        createAlbumTranslationsQuery([
          {albumId, description: 'Description', locale: 'ko', title: 'Old Title'},
        ]),
      )

    await expect(
      createAlbum({
        ...input,
        translations: [{description: 'Description', locale: 'ko', title: 'New Title'}],
      }),
    ).resolves.toEqual({code: 'album_creation_payload_mismatch', success: false})
    expect(transactionInsert).toHaveBeenCalledOnce()
  })

  it('should propagate a transaction failure', async () => {
    transactionalDatabase.transaction.mockRejectedValueOnce(new Error('create failed'))
    await expect(createAlbum(input)).rejects.toThrow('create failed')
  })

  it('should return an existing covered album without reclaiming its reservation', async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined)
    const updateSet = vi.fn(() => ({where: updateWhere}))
    transactionUpdate.mockReturnValueOnce({set: updateSet})
    transactionSelect
      .mockReturnValueOnce(
        createAlbumQuery([
          {
            coverDraftId: 'draft-id',
            coverFallback: 'music',
            coverImageUrl: 'https://cdn.example/original-cover.webp',
            id: albumId,
            status: 'draft',
          },
        ]),
      )
      .mockReturnValueOnce(
        createAlbumTranslationsQuery([
          {albumId, description: 'Description', locale: 'ko', title: 'Title'},
        ]),
      )

    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'draft-id',
        coverImageUrl: 'https://cdn.example/cover.webp',
        coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      }),
    ).resolves.toMatchObject({album: {id: albumId}, success: true})
    expect(transactionInsert).not.toHaveBeenCalled()
    expect(transactionDelete).not.toHaveBeenCalled()
    expect(updateSet).toHaveBeenCalledWith({status: 'deleting', updatedAt: expect.any(Date)})
    expect(updateWhere).toHaveBeenCalledOnce()
  })

  it('should reject a retried creation ID when a different cover draft is uploaded', async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined)
    const updateSet = vi.fn(() => ({where: updateWhere}))
    transactionUpdate.mockReturnValueOnce({set: updateSet})
    transactionSelect
      .mockReturnValueOnce(
        createAlbumQuery([
          {
            coverDraftId: 'original-draft-id',
            coverFallback: 'music',
            coverImageUrl: 'https://cdn.example/original-cover.webp',
            id: albumId,
            status: 'draft',
          },
        ]),
      )
      .mockReturnValueOnce(
        createAlbumTranslationsQuery([
          {albumId, description: 'Description', locale: 'ko', title: 'Title'},
        ]),
      )

    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'new-draft-id',
        coverImageUrl: 'https://cdn.example/new-cover.webp',
        coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      }),
    ).resolves.toEqual({code: 'album_creation_payload_mismatch', success: false})
    expect(updateSet).toHaveBeenCalledWith({status: 'deleting', updatedAt: expect.any(Date)})
    expect(updateWhere).toHaveBeenCalledOnce()
  })

  it('should return a covered album completed while its reservation lookup was waiting', async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined)
    transactionUpdate.mockReturnValueOnce({set: vi.fn(() => ({where: updateWhere}))})
    transactionSelect
      .mockReturnValueOnce(createAlbumQuery([]))
      .mockReturnValueOnce(createLockedAlbumQuery([]))
      .mockReturnValueOnce(
        createAlbumQuery([
          {
            coverDraftId: 'draft-id',
            coverFallback: 'music',
            coverImageUrl: 'https://cdn.example/original-cover.webp',
            id: albumId,
            status: 'draft',
          },
        ]),
      )
      .mockReturnValueOnce(
        createAlbumTranslationsQuery([
          {albumId, description: 'Description', locale: 'ko', title: 'Title'},
        ]),
      )

    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'draft-id',
        coverImageUrl: 'https://cdn.example/cover.webp',
        coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
      }),
    ).resolves.toMatchObject({album: {id: albumId}, success: true})
    expect(transactionInsert).not.toHaveBeenCalled()
    expect(updateWhere).toHaveBeenCalledOnce()
  })

  it('should claim a matching pending cover reservation atomically', async () => {
    transactionSelect
      .mockReturnValueOnce(createAlbumQuery([]))
      .mockReturnValueOnce(
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

  it.each([
    {reservation: []},
    {reservation: [{coverImageUrl: 'https://cdn.example/other.webp', draftId: 'draft-id'}]},
    {reservation: [{coverImageUrl: 'https://cdn.example/cover.webp', draftId: 'other-draft'}]},
  ])(
    'should reject missing or mismatched cover reservation %# before album insertion',
    async ({reservation}) => {
      transactionSelect
        .mockReturnValueOnce(createAlbumQuery([]))
        .mockReturnValueOnce(createLockedAlbumQuery(reservation))
        .mockReturnValueOnce(createAlbumQuery([]))

      await expect(
        createAlbum({
          ...input,
          coverDraftId: 'draft-id',
          coverImageUrl: 'https://cdn.example/cover.webp',
          coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783',
        }),
      ).resolves.toEqual({code: 'cover_reservation_invalid', success: false})
      expect(transactionInsert).not.toHaveBeenCalled()
    },
  )

  it('should reject incomplete cover ownership input before a reservation lookup', async () => {
    await expect(createAlbum({...input, coverDraftId: 'draft-id'})).resolves.toEqual({
      code: 'cover_reservation_invalid',
      success: false,
    })
    await expect(
      createAlbum({...input, coverReservationId: '019d1990-1dc9-7255-a7b5-f9459dfaf783'}),
    ).resolves.toEqual({code: 'cover_reservation_invalid', success: false})
    expect(transactionSelect).not.toHaveBeenCalled()
  })
})
