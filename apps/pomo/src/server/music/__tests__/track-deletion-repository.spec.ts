import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  finalizeTrackDeletion,
  markTrackDeletionStorageDeleted,
  prepareTrackDeletion,
} from '../track-deletion-repository'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn(), withTransactionalDatabase: vi.fn()}))

vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')

  return {...actual, ...databaseMocks}
})

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const select = vi.fn()
const insert = vi.fn()
const updateWhere = vi.fn().mockResolvedValue(undefined)
const updateSet = vi.fn(() => ({where: updateWhere}))
const update = vi.fn(() => ({set: updateSet}))
const deleteRecord = vi.fn()
const readUpdate = vi.fn()
const transaction = {delete: deleteRecord, insert, select, update}
const database = {
  transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<unknown>) =>
    operation(transaction),
  ),
}
const readDatabase = {update: readUpdate}

const createLockedQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      for: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
    })),
  })),
})

const createLimitedQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({limit: vi.fn().mockResolvedValue(result)})),
  })),
})

const createWhereQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({where: vi.fn().mockResolvedValue(result)})),
})

beforeEach(() => {
  vi.clearAllMocks()
  select.mockReset()
  insert.mockReset()
  update.mockClear()
  updateSet.mockClear()
  updateWhere.mockClear()
  deleteRecord.mockReset()
  readUpdate.mockReset()
  database.transaction.mockImplementation(async (operation) => operation(transaction))
  databaseMocks.getDatabase.mockReturnValue(readDatabase)
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(database),
  )
})

describe('prepareTrackDeletion', () => {
  it('should prepare cleanup for a track that was never attached to an album', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createWhereQuery([]))
    const values = vi.fn().mockResolvedValue(undefined)
    insert.mockReturnValue({values})

    await expect(prepareTrackDeletion(TRACK_ID)).resolves.toEqual({
      objectKeys: [],
      storageDeleted: false,
    })
    expect(values).toHaveBeenCalledWith({objectKeys: [], trackId: TRACK_ID})
  })

  it('should claim a stale pending registration only after rechecking its age', async () => {
    const staleBefore = new Date('2026-08-24T09:00:00.000Z')
    select
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([{trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createWhereQuery([]))
    const values = vi.fn().mockResolvedValue(undefined)
    insert.mockReturnValue({values})

    await expect(prepareTrackDeletion(TRACK_ID, {staleBefore})).resolves.toEqual({
      objectKeys: [],
      storageDeleted: false,
    })
    expect(values).toHaveBeenCalledWith({objectKeys: [], trackId: TRACK_ID})
  })

  it('should retire active playback before continuing an existing deletion job', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(
        createLimitedQuery([
          {objectKeys: [`tracks/${TRACK_ID}/${TRACK_ID}/source.mp3`], storageDeletedAt: null},
        ]),
      )

    await expect(prepareTrackDeletion(TRACK_ID)).resolves.toEqual({
      objectKeys: [`tracks/${TRACK_ID}/${TRACK_ID}/source.mp3`],
      storageDeleted: false,
    })
    expect(updateSet).toHaveBeenCalledWith({retiredAt: expect.any(Date), status: 'retired'})
  })

  it('should return null when the track does not exist', async () => {
    select.mockReturnValueOnce(createLockedQuery([]))

    await expect(prepareTrackDeletion(TRACK_ID)).resolves.toBeNull()
    expect(update).not.toHaveBeenCalled()
  })

  it('should leave a fresh registration unclaimed during stale cleanup', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([]))

    await expect(
      prepareTrackDeletion(TRACK_ID, {staleBefore: new Date('2026-08-24T09:00:00Z')}),
    ).resolves.toBeNull()
    expect(update).not.toHaveBeenCalled()
  })

  it('should preserve an existing job whose storage was deleted', async () => {
    select.mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}])).mockReturnValueOnce(
      createLimitedQuery([
        {
          objectKeys: [`tracks/${TRACK_ID}/asset/source.mp3`],
          storageDeletedAt: new Date('2026-08-24T10:00:00Z'),
        },
      ]),
    )

    await expect(prepareTrackDeletion(TRACK_ID)).resolves.toEqual({
      objectKeys: [`tracks/${TRACK_ID}/asset/source.mp3`],
      storageDeleted: true,
    })
  })

  it('should collect object keys with active assets ordered last', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(
        createWhereQuery([
          {objectKey: 'active.mp3', status: 'active'},
          {objectKey: 'retired.mp3', status: 'retired'},
          {objectKey: 'pending.mp3', status: 'pending'},
        ]),
      )
    const values = vi.fn().mockResolvedValue(undefined)
    insert.mockReturnValueOnce({values})

    await expect(prepareTrackDeletion(TRACK_ID)).resolves.toEqual({
      objectKeys: ['retired.mp3', 'pending.mp3', 'active.mp3'],
      storageDeleted: false,
    })
    expect(values).toHaveBeenCalledWith({
      objectKeys: ['retired.mp3', 'pending.mp3', 'active.mp3'],
      trackId: TRACK_ID,
    })
  })

  it('should propagate a transaction failure', async () => {
    database.transaction.mockRejectedValueOnce(new Error('prepare failed'))

    await expect(prepareTrackDeletion(TRACK_ID)).rejects.toThrow('prepare failed')
  })
})

describe('markTrackDeletionStorageDeleted', () => {
  it.each([
    ['an updated job', [{trackId: TRACK_ID}], true],
    ['a missing job', [], false],
  ] as const)('should report %s', async (_name, result, expected) => {
    readUpdate.mockReturnValueOnce({
      set: vi.fn(() => ({
        where: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
      })),
    })

    await expect(markTrackDeletionStorageDeleted(TRACK_ID)).resolves.toBe(expected)
  })

  it('should propagate a database update failure', async () => {
    readUpdate.mockReturnValueOnce({
      set: vi.fn(() => ({
        where: vi.fn(() => ({returning: vi.fn().mockRejectedValue(new Error('mark failed'))})),
      })),
    })

    await expect(markTrackDeletionStorageDeleted(TRACK_ID)).rejects.toThrow('mark failed')
  })
})

describe('finalizeTrackDeletion', () => {
  it('should return false when no storage-deleted job exists', async () => {
    select.mockReturnValueOnce(createLockedQuery([]))

    await expect(finalizeTrackDeletion(TRACK_ID)).resolves.toBe(false)
    expect(deleteRecord).not.toHaveBeenCalled()
  })

  it('should delete assets, album references, and the track', async () => {
    select.mockReturnValueOnce(createLockedQuery([{trackId: TRACK_ID}]))
    const where = vi.fn().mockResolvedValue(undefined)
    deleteRecord.mockReturnValue({where})

    await expect(finalizeTrackDeletion(TRACK_ID)).resolves.toBe(true)

    expect(deleteRecord).toHaveBeenCalledTimes(3)
    expect(where).toHaveBeenCalledTimes(3)
  })

  it('should propagate a transaction failure', async () => {
    database.transaction.mockRejectedValueOnce(new Error('finalize failed'))

    await expect(finalizeTrackDeletion(TRACK_ID)).rejects.toThrow('finalize failed')
  })

  it('should propagate a referenced-row deletion failure', async () => {
    select.mockReturnValueOnce(createLockedQuery([{trackId: TRACK_ID}]))
    deleteRecord.mockReturnValueOnce({
      where: vi.fn().mockRejectedValue(new Error('reference delete failed')),
    })

    await expect(finalizeTrackDeletion(TRACK_ID)).rejects.toThrow('reference delete failed')
  })
})
