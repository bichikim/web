import {beforeEach, describe, expect, it, vi} from 'vitest'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn(), withTransactionalDatabase: vi.fn()}))

vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')
  return {...actual, ...databaseMocks}
})

import {
  completeAlbumCoverReservation,
  createAlbumCoverReservation,
  finalizeAlbumCoverDeletion,
  listAlbumCoverCleanupCandidates,
  prepareAlbumCoverDeletion,
} from '../album-cover-reservation'

const RESERVATION_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf783'
const DRAFT_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const OBJECT_KEY = `album-covers/${RESERVATION_ID}/cover.webp`
const NOW = new Date('2026-08-30T00:00:00.000Z')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createAlbumCoverReservation', () => {
  it('should create an uploading reservation before object storage starts', async () => {
    const returning = vi.fn().mockResolvedValue([{id: RESERVATION_ID, objectKey: OBJECT_KEY}])
    const values = vi.fn(() => ({returning}))
    databaseMocks.getDatabase.mockReturnValue({insert: vi.fn(() => ({values}))})

    await expect(
      createAlbumCoverReservation(DRAFT_ID, {id: RESERVATION_ID, now: NOW}),
    ).resolves.toEqual({id: RESERVATION_ID, objectKey: OBJECT_KEY})
    expect(values).toHaveBeenCalledWith({
      draftId: DRAFT_ID,
      expiresAt: new Date('2026-08-31T00:00:00.000Z'),
      id: RESERVATION_ID,
      objectKey: OBJECT_KEY,
    })
  })

  it('should generate an identifier and reject a missing insert result', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(RESERVATION_ID)
    const returning = vi.fn().mockResolvedValue([])
    databaseMocks.getDatabase.mockReturnValue({
      insert: vi.fn(() => ({values: vi.fn(() => ({returning}))})),
    })

    await expect(createAlbumCoverReservation(DRAFT_ID, {now: NOW})).rejects.toThrow(
      'Failed to create an album cover reservation',
    )
  })
})

describe('completeAlbumCoverReservation', () => {
  it.each([
    ['completed', [{id: RESERVATION_ID}], true],
    ['expired', [], false],
  ])('should report a %s reservation update', async (_label, rows, expected) => {
    const returning = vi.fn().mockResolvedValue(rows)
    const where = vi.fn(() => ({returning}))
    const set = vi.fn(() => ({where}))
    databaseMocks.getDatabase.mockReturnValue({update: vi.fn(() => ({set}))})

    await expect(
      completeAlbumCoverReservation(RESERVATION_ID, 'https://cdn.example/cover.webp', NOW),
    ).resolves.toBe(expected)
    expect(set).toHaveBeenCalledWith({
      coverImageUrl: 'https://cdn.example/cover.webp',
      status: 'pending',
      updatedAt: NOW,
    })
  })
})

describe('listAlbumCoverCleanupCandidates', () => {
  it('should list a bounded expiry-ordered cleanup batch', async () => {
    const limit = vi.fn().mockResolvedValue([{id: RESERVATION_ID}])
    const orderBy = vi.fn(() => ({limit}))
    const where = vi.fn(() => ({orderBy}))
    databaseMocks.getDatabase.mockReturnValue({
      select: vi.fn(() => ({from: vi.fn(() => ({where}))})),
    })

    await expect(listAlbumCoverCleanupCandidates(NOW, 26)).resolves.toEqual([{id: RESERVATION_ID}])
    expect(limit).toHaveBeenCalledExactlyOnceWith(26)
  })
})

describe('prepareAlbumCoverDeletion', () => {
  const runWithRow = (row: unknown) => {
    const limit = vi.fn().mockResolvedValue(row === undefined ? [] : [row])
    const lockedSelect = {
      from: vi.fn(() => ({
        where: vi.fn(() => ({for: vi.fn(() => ({limit}))})),
      })),
    }
    const updateWhere = vi.fn().mockResolvedValue(undefined)
    const transaction = {
      select: vi.fn(() => lockedSelect),
      update: vi.fn(() => ({set: vi.fn(() => ({where: updateWhere}))})),
    }
    databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
      operation({
        transaction: async (callback: (value: typeof transaction) => unknown) =>
          callback(transaction),
      }),
    )
    return {transaction, updateWhere}
  }

  it('should claim an expired uploading reservation for deletion', async () => {
    const {transaction, updateWhere} = runWithRow({
      expiresAt: new Date('2026-08-29T23:59:00.000Z'),
      objectKey: OBJECT_KEY,
      status: 'uploading',
    })

    await expect(prepareAlbumCoverDeletion(RESERVATION_ID, NOW)).resolves.toBe(OBJECT_KEY)
    expect(transaction.update).toHaveBeenCalledOnce()
    expect(updateWhere).toHaveBeenCalledOnce()
  })

  it('should resume a previously claimed deletion without another update', async () => {
    const {transaction} = runWithRow({expiresAt: NOW, objectKey: OBJECT_KEY, status: 'deleting'})

    await expect(prepareAlbumCoverDeletion(RESERVATION_ID, NOW)).resolves.toBe(OBJECT_KEY)
    expect(transaction.update).not.toHaveBeenCalled()
  })

  it.each([
    ['missing', undefined],
    [
      'unexpired',
      {
        expiresAt: new Date('2026-08-30T00:01:00.000Z'),
        objectKey: OBJECT_KEY,
        status: 'pending',
      },
    ],
  ])('should ignore a %s reservation', async (_label, row) => {
    const {transaction} = runWithRow(row)

    await expect(prepareAlbumCoverDeletion(RESERVATION_ID, NOW)).resolves.toBeNull()
    expect(transaction.update).not.toHaveBeenCalled()
  })
})

describe('finalizeAlbumCoverDeletion', () => {
  it.each([
    ['deleted', [{id: RESERVATION_ID}], true],
    ['missing', [], false],
  ])('should report a %s reservation finalization', async (_label, rows, expected) => {
    const returning = vi.fn().mockResolvedValue(rows)
    databaseMocks.getDatabase.mockReturnValue({
      delete: vi.fn(() => ({where: vi.fn(() => ({returning}))})),
    })

    await expect(finalizeAlbumCoverDeletion(RESERVATION_ID)).resolves.toBe(expected)
  })
})
