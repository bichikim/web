import {beforeEach, describe, expect, it, vi} from 'vitest'

import {
  completeTrackRegistration,
  createPendingTrack,
  failTrackAsset,
  findActiveTrackAsset,
  findTrackAsset,
  reserveTrackAsset,
} from '../track-registration-repository'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn(), withTransactionalDatabase: vi.fn()}))

vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')

  return {...actual, ...databaseMocks}
})

const ALBUM_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf780'
const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'
const ASSET_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
const COMPLETE_INPUT = {
  artworkUrl: null,
  assetId: ASSET_ID,
  durationMs: 1234,
  etag: 'etag',
  sizeBytes: 1234n,
}
const select = vi.fn()
const insert = vi.fn()
const update = vi.fn()
const deleteRecord = vi.fn()
const readSelect = vi.fn()
const readUpdate = vi.fn()
const transaction = {delete: deleteRecord, insert, select, update}
const database = {
  transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<unknown>) =>
    operation(transaction),
  ),
}
const readDatabase = {select: readSelect, update: readUpdate}

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

const createStatusUpdate = () => ({
  set: vi.fn(() => ({where: vi.fn().mockResolvedValue(undefined)})),
})

beforeEach(() => {
  vi.clearAllMocks()
  select.mockReset()
  insert.mockReset()
  update.mockReset()
  deleteRecord.mockReset()
  readSelect.mockReset()
  readUpdate.mockReset()
  database.transaction.mockImplementation(async (operation) => operation(transaction))
  databaseMocks.getDatabase.mockReturnValue(readDatabase)
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
  it('should treat a concurrently completed asset as an idempotent success', async () => {
    select.mockReturnValueOnce(createLockedQuery([{status: 'active', trackId: TRACK_ID}]))

    await expect(
      completeTrackRegistration({
        artworkUrl: null,
        assetId: ASSET_ID,
        durationMs: 1234,
        etag: 'etag',
        sizeBytes: 1234n,
      }),
    ).resolves.toBe(true)
    expect(update).not.toHaveBeenCalled()
    expect(insert).not.toHaveBeenCalled()
    expect(deleteRecord).not.toHaveBeenCalled()
  })

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
        artworkUrl: 'https://storage.pomofi.io/track-artwork/asset/cover',
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
        artworkUrl: null,
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

  it('should reject a new reservation after deletion has claimed the track', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([{trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([{trackId: TRACK_ID}]))

    await expect(reserveTrackAsset(TRACK_ID)).resolves.toBeNull()
    expect(insert).not.toHaveBeenCalled()
  })

  it('should reuse the pending asset instead of creating an orphaned duplicate', async () => {
    const objectKey = `tracks/${TRACK_ID}/${ASSET_ID}/source.mp3`
    select
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([{trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createLimitedQuery([{assetId: ASSET_ID, objectKey}]))

    await expect(reserveTrackAsset(TRACK_ID)).resolves.toEqual({assetId: ASSET_ID, objectKey})
    expect(insert).not.toHaveBeenCalled()
  })
})

describe('createPendingTrack edge cases', () => {
  it('should return null when the album does not exist', async () => {
    select.mockReturnValueOnce(createLockedQuery([]))

    await expect(
      createPendingTrack({albumId: ALBUM_ID, artist: 'Artist', title: 'Title'}),
    ).resolves.toBeNull()
    expect(insert).not.toHaveBeenCalled()
  })

  it('should reject when the track insert returns no row', async () => {
    select.mockReturnValueOnce(createLockedQuery([{id: ALBUM_ID}]))
    insert.mockReturnValueOnce({
      values: vi.fn(() => ({returning: vi.fn().mockResolvedValue([])})),
    })

    await expect(
      createPendingTrack({albumId: ALBUM_ID, artist: 'Artist', title: 'Title'}),
    ).rejects.toThrow('Failed to create a music track')
  })
})

describe('reserveTrackAsset edge cases', () => {
  it('should return null when the track does not exist', async () => {
    select.mockReturnValueOnce(createLockedQuery([]))

    await expect(reserveTrackAsset(TRACK_ID)).resolves.toBeNull()
  })

  it('should create a new pending asset when no reservation exists', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([{trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createLimitedQuery([]))
    const values = vi.fn().mockResolvedValue(undefined)
    insert.mockReturnValueOnce({values})

    const result = await reserveTrackAsset(TRACK_ID)

    expect(result?.assetId).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
    )
    expect(result?.objectKey).toBe(`tracks/${TRACK_ID}/${result?.assetId}/source.mp3`)
    expect(values).toHaveBeenCalledWith({
      id: result?.assetId,
      objectKey: result?.objectKey,
      trackId: TRACK_ID,
    })
  })
})

describe('completeTrackRegistration edge cases', () => {
  it('should return false when the asset does not exist', async () => {
    select.mockReturnValueOnce(createLockedQuery([]))

    await expect(completeTrackRegistration(COMPLETE_INPUT)).resolves.toBe(false)
  })

  it('should return false when the asset is no longer pending', async () => {
    select.mockReturnValueOnce(createLockedQuery([{status: 'failed', trackId: TRACK_ID}]))

    await expect(completeTrackRegistration(COMPLETE_INPUT)).resolves.toBe(false)
  })

  it('should return false when the track no longer exists', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{status: 'pending', trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([]))

    await expect(completeTrackRegistration(COMPLETE_INPUT)).resolves.toBe(false)
  })

  it('should return false when the registration no longer exists', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{status: 'pending', trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createLimitedQuery([]))

    await expect(completeTrackRegistration(COMPLETE_INPUT)).resolves.toBe(false)
  })

  it('should return false when the album no longer exists', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{status: 'pending', trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createLimitedQuery([{albumId: ALBUM_ID}]))
      .mockReturnValueOnce(createLockedQuery([]))
      .mockReturnValueOnce(createLockedQuery([{albumId: ALBUM_ID}]))

    await expect(completeTrackRegistration(COMPLETE_INPUT)).resolves.toBe(false)
  })

  it('should return false when the locked registration changed albums', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{status: 'pending', trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createLimitedQuery([{albumId: ALBUM_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: ALBUM_ID}]))
      .mockReturnValueOnce(createLockedQuery([{albumId: 'another-album'}]))

    await expect(completeTrackRegistration(COMPLETE_INPUT)).resolves.toBe(false)
  })

  it('should return false when activation loses a concurrent update', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{status: 'pending', trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createLimitedQuery([{albumId: ALBUM_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: ALBUM_ID}]))
      .mockReturnValueOnce(createLockedQuery([{albumId: ALBUM_ID}]))
    update.mockReturnValueOnce(createStatusUpdate()).mockReturnValueOnce({
      set: vi.fn(() => ({
        where: vi.fn(() => ({returning: vi.fn().mockResolvedValue([])})),
      })),
    })

    await expect(completeTrackRegistration(COMPLETE_INPUT)).resolves.toBe(false)
  })

  it('should assign position zero when the album has no tracks', async () => {
    select
      .mockReturnValueOnce(createLockedQuery([{status: 'pending', trackId: TRACK_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: TRACK_ID}]))
      .mockReturnValueOnce(createLimitedQuery([]))
      .mockReturnValueOnce(createLimitedQuery([{albumId: ALBUM_ID}]))
      .mockReturnValueOnce(createLockedQuery([{id: ALBUM_ID}]))
      .mockReturnValueOnce(createLockedQuery([{albumId: ALBUM_ID}]))
      .mockReturnValueOnce(createWhereQuery([]))
    update.mockReturnValueOnce(createStatusUpdate()).mockReturnValueOnce({
      set: vi.fn(() => ({
        where: vi.fn(() => ({returning: vi.fn().mockResolvedValue([{id: ASSET_ID}])})),
      })),
    })
    const values = vi.fn().mockResolvedValue(undefined)
    insert.mockReturnValueOnce({values})
    deleteRecord.mockReturnValueOnce({where: vi.fn().mockResolvedValue(undefined)})

    await expect(completeTrackRegistration(COMPLETE_INPUT)).resolves.toBe(true)
    expect(values).toHaveBeenCalledWith({albumId: ALBUM_ID, position: 0, trackId: TRACK_ID})
  })
})

describe('track asset reads and failures', () => {
  it('should mark a pending asset failed', async () => {
    const where = vi.fn().mockResolvedValue(undefined)
    readUpdate.mockReturnValueOnce({set: vi.fn(() => ({where}))})

    await failTrackAsset(ASSET_ID, 'invalid_mp3')

    expect(where).toHaveBeenCalledOnce()
  })

  it.each([
    ['an asset by id', findTrackAsset, {id: ASSET_ID, objectKey: 'pending.mp3', status: 'pending'}],
    ['an active asset', findActiveTrackAsset, {assetId: ASSET_ID, objectKey: 'active.mp3'}],
  ] as const)('should find %s', async (_name, findAsset, asset) => {
    readSelect.mockReturnValueOnce(createLimitedQuery([asset]))

    await expect(findAsset(ASSET_ID)).resolves.toEqual(asset)
  })

  it.each([
    ['an asset by id', findTrackAsset],
    ['an active asset', findActiveTrackAsset],
  ] as const)('should return null when %s is missing', async (_name, findAsset) => {
    readSelect.mockReturnValueOnce(createLimitedQuery([]))

    await expect(findAsset(ASSET_ID)).resolves.toBeNull()
  })

  it('should propagate a direct database write failure', async () => {
    readUpdate.mockReturnValueOnce({
      set: vi.fn(() => ({where: vi.fn().mockRejectedValue(new Error('write failed'))})),
    })

    await expect(failTrackAsset(ASSET_ID, 'invalid_mp3')).rejects.toThrow('write failed')
  })

  it('should propagate a direct database read failure', async () => {
    readSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({limit: vi.fn().mockRejectedValue(new Error('read failed'))})),
      })),
    })

    await expect(findTrackAsset(ASSET_ID)).rejects.toThrow('read failed')
  })
})

describe('transaction failures', () => {
  it.each([
    ['track creation', () => createPendingTrack({albumId: ALBUM_ID, artist: 'A', title: 'T'})],
    ['asset reservation', () => reserveTrackAsset(TRACK_ID)],
    ['registration completion', () => completeTrackRegistration(COMPLETE_INPUT)],
  ] as const)('should propagate a %s transaction failure', async (_name, operation) => {
    database.transaction.mockRejectedValueOnce(new Error('transaction failed'))

    await expect(operation()).rejects.toThrow('transaction failed')
  })
})
