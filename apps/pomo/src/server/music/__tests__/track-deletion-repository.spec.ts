import {beforeEach, describe, expect, it, vi} from 'vitest'

import {prepareTrackDeletion} from '../track-deletion-repository'

const databaseMocks = vi.hoisted(() => ({withTransactionalDatabase: vi.fn()}))

vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')

  return {...actual, withTransactionalDatabase: databaseMocks.withTransactionalDatabase}
})

const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const select = vi.fn()
const insert = vi.fn()
const transaction = {insert, select}
const database = {
  transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<unknown>) =>
    operation(transaction),
  ),
}

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
})
