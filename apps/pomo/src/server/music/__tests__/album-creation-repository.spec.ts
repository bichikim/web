import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {createAlbum} from '../album-creation-repository'

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

const createAlbumQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
  })),
})

const createLockedAlbumQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      for: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
    })),
  })),
})

const createAlbumTranslationsQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({where: vi.fn().mockResolvedValue(result)})),
})

const createReturningInsert = (result: ReadonlyArray<unknown>) => ({
  values: vi.fn(() => ({
    onConflictDoNothing: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
    returning: vi.fn().mockResolvedValue(result),
  })),
})

const ALBUM_ID = '00000000-0000-4000-8000-000000000002'
const RESERVATION_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf783'
const NOW = new Date('2026-09-02T12:00:00.000Z')
const input = {
  coverDraftId: null,
  coverFallback: 'music' as const,
  coverImageUrl: null,
  coverReservationId: null,
  id: ALBUM_ID,
  translations: [{description: 'Description', locale: 'ko' as const, title: 'Title'}],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  transactionSelect.mockReset()
  transactionInsert.mockReset()
  transactionUpdate.mockReset()
  transactionDelete.mockReset()
  transactionalDatabase.transaction.mockImplementation(async (operation) => operation(transaction))
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(transactionalDatabase),
  )
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createAlbum', () => {
  it('should map an album creation to one database transaction', async () => {
    transactionInsert
      .mockReturnValueOnce(createReturningInsert([createdAlbum()]))
      .mockReturnValueOnce(createReturningInsert(createdTranslations()))

    await expect(createAlbum(input)).resolves.toEqual({
      album: {...createdAlbum(), translations: createdTranslations()},
      success: true,
    })
    expect(transactionalDatabase.transaction).toHaveBeenCalledOnce()
  })

  it('should map the transaction time when releasing an unused cover', async () => {
    const updateWhere = vi.fn().mockResolvedValue(undefined)
    const updateSet = vi.fn(() => ({where: updateWhere}))
    transactionUpdate.mockReturnValueOnce({set: updateSet})
    transactionSelect
      .mockReturnValueOnce(
        createAlbumQuery([
          {
            ...createdAlbum(),
            coverDraftId: 'draft-id',
            coverImageUrl: 'https://cdn.example/original-cover.webp',
          },
        ]),
      )
      .mockReturnValueOnce(createAlbumTranslationsQuery(createdTranslations()))

    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'draft-id',
        coverImageUrl: 'https://cdn.example/cover.webp',
        coverReservationId: RESERVATION_ID,
      }),
    ).resolves.toMatchObject({album: {id: ALBUM_ID}, success: true})
    expect(updateSet).toHaveBeenCalledWith({status: 'deleting', updatedAt: NOW})
  })

  it('should map cover reservation locking and consumption', async () => {
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
          {...createdAlbum(), coverImageUrl: 'https://cdn.example/cover.webp'},
        ]),
      )
      .mockReturnValueOnce(createReturningInsert(createdTranslations()))
    const deleteWhere = vi.fn().mockResolvedValue(undefined)
    transactionDelete.mockReturnValueOnce({where: deleteWhere})

    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'draft-id',
        coverImageUrl: 'https://cdn.example/cover.webp',
        coverReservationId: RESERVATION_ID,
      }),
    ).resolves.toMatchObject({album: {id: ALBUM_ID}, success: true})
    expect(deleteWhere).toHaveBeenCalledOnce()
  })

  it('should map an insert conflict to the existing album reader', async () => {
    transactionInsert.mockReturnValueOnce(createReturningInsert([]))
    transactionSelect
      .mockReturnValueOnce(createAlbumQuery([{...createdAlbum(), coverDraftId: null}]))
      .mockReturnValueOnce(createAlbumTranslationsQuery(createdTranslations()))

    await expect(createAlbum(input)).resolves.toMatchObject({
      album: {id: ALBUM_ID},
      success: true,
    })
  })

  it('should map a missing locked reservation to the domain absence contract', async () => {
    transactionSelect
      .mockReturnValueOnce(createAlbumQuery([]))
      .mockReturnValueOnce(createLockedAlbumQuery([]))
      .mockReturnValueOnce(createAlbumQuery([]))

    await expect(
      createAlbum({
        ...input,
        coverDraftId: 'draft-id',
        coverImageUrl: 'https://cdn.example/cover.webp',
        coverReservationId: RESERVATION_ID,
      }),
    ).resolves.toEqual({code: 'cover_reservation_invalid', success: false})
  })

  it('should propagate a transaction failure', async () => {
    transactionalDatabase.transaction.mockRejectedValueOnce(new Error('create failed'))

    await expect(createAlbum(input)).rejects.toThrow('create failed')
  })
})

const createdAlbum = () => ({
  coverFallback: 'music' as const,
  coverImageUrl: null,
  id: ALBUM_ID,
  status: 'draft' as const,
})

const createdTranslations = () => [
  {albumId: ALBUM_ID, description: 'Description', locale: 'ko' as const, title: 'Title'},
]
