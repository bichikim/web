import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  completeTrackRegistration,
  createPendingTrack,
  reserveTrackAsset,
} from '../track-registration-repository'

const databaseMocks = vi.hoisted(() => ({withTransactionalDatabase: vi.fn()}))

vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')

  return {...actual, withTransactionalDatabase: databaseMocks.withTransactionalDatabase}
})

const ALBUM_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf780'
const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const select = vi.fn()
const insert = vi.fn()
const update = vi.fn()
const deleteRecord = vi.fn()
const transaction = {delete: deleteRecord, insert, select, update}
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
  update.mockReset()
  deleteRecord.mockReset()
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(database),
  )
})

describe('createPendingTrack', () => {
  it('should keep a new track detached from its album until MP3 activation', async () => {
    select.mockReturnValueOnce(createLockedQuery([{id: ALBUM_ID}]))
    const returning = vi.fn().mockResolvedValue([{artist: 'Artist', id: TRACK_ID, title: 'Title'}])
    const trackValues = vi.fn(() => ({returning}))
    const registrationValues = vi.fn().mockResolvedValue(undefined)
    insert
      .mockReturnValueOnce({values: trackValues})
      .mockReturnValueOnce({values: registrationValues})

    await expect(
      createPendingTrack({albumId: ALBUM_ID, artist: 'Artist', title: 'Title'}),
    ).resolves.toEqual({artist: 'Artist', id: TRACK_ID, title: 'Title'})
    expect(registrationValues).toHaveBeenCalledWith({albumId: ALBUM_ID, trackId: TRACK_ID})
  })
})

describe('completeTrackRegistration', () => {
  it('should activate the MP3 and attach its track to the album in one transaction', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{status: 'pending', trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createLimitedQuery([{albumId: ALBUM_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: ALBUM_ID}]))
      .mockReturnValueOnce(createLockedQuery([{albumId: ALBUM_ID}]))
      .mockReturnValueOnce(createWhereQuery([{position: 2}]))
    const retiredWhere = vi.fn().mockResolvedValue(undefined)
    const activatedReturning = vi.fn().mockResolvedValue([{id: ASSET_ID}])
    const activatedWhere = vi.fn(() => ({returning: activatedReturning}))
    update
      .mockReturnValueOnce({set: vi.fn(() => ({where: retiredWhere}))})
      .mockReturnValueOnce({set: vi.fn(() => ({where: activatedWhere}))})
    const values = vi.fn().mockResolvedValue(undefined)
    insert.mockReturnValue({values})
    const deleteWhere = vi.fn().mockResolvedValue(undefined)
    deleteRecord.mockReturnValue({where: deleteWhere})

    await expect(
      completeTrackRegistration({
        assetId: ASSET_ID,
        durationMs: 1234,
        etag: 'etag',
        sizeBytes: 1234n,
      }),
    ).resolves.toBe(true)
    expect(values).toHaveBeenCalledWith({albumId: ALBUM_ID, position: 3, trackId: TRACK_ID})
    expect(deleteWhere).toHaveBeenCalledOnce()
  })

  it('should reject activation after cleanup has claimed the track', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{status: 'pending', trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([{trackId: TRACK_ID}]))

    await expect(
      completeTrackRegistration({
        assetId: ASSET_ID,
        durationMs: 1234,
        etag: 'etag',
        sizeBytes: 1234n,
      }),
    ).resolves.toBe(false)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('reserveTrackAsset', () => {
  it('should reject an asset reservation for a track without a pending registration', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))

    await expect(reserveTrackAsset(TRACK_ID)).resolves.toBeNull()
    expect(insert).not.toHaveBeenCalled()
  })
})
