import {beforeEach, describe, expect, it, vi} from 'vitest'

import {listAdminMusic, updateAlbumStatus} from '../admin-repository'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn(), withTransactionalDatabase: vi.fn()}))

vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')

  return {
    ...actual,
    getDatabase: databaseMocks.getDatabase,
    withTransactionalDatabase: databaseMocks.withTransactionalDatabase,
  }
})

const select = vi.fn()
const readSelect = vi.fn()
const updateWhere = vi.fn().mockResolvedValue(undefined)
const updateSet = vi.fn(() => ({where: updateWhere}))
const update = vi.fn(() => ({set: updateSet}))
const transaction = {select, update}
const database = {
  transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<unknown>) =>
    operation(transaction),
  ),
}
const readDatabase = {select: readSelect}

const createAlbumQuery = () => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      for: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue([{publishedAt: null, status: 'draft'}]),
      })),
    })),
  })),
})

const createTracksQuery = (
  tracks: ReadonlyArray<{readonly activeAssetTrackId: string | null; readonly trackId: string}>,
) => ({
  from: vi.fn(() => ({
    leftJoin: vi.fn(() => ({where: vi.fn().mockResolvedValue(tracks)})),
  })),
})

const createOrderedQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({orderBy: vi.fn().mockResolvedValue(result)})),
})

const createJoinedOrderedQuery = (result: ReadonlyArray<unknown>, joinCount: 1 | 2) => ({
  from: vi.fn(() => {
    const orderBy = vi.fn().mockResolvedValue(result)

    if (joinCount === 1) {
      return {innerJoin: vi.fn(() => ({orderBy}))}
    }

    return {innerJoin: vi.fn(() => ({innerJoin: vi.fn(() => ({orderBy}))}))}
  }),
})

beforeEach(() => {
  vi.clearAllMocks()
  readSelect.mockReset()
  select.mockReset()
  databaseMocks.getDatabase.mockReturnValue(readDatabase)
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(database),
  )
  select.mockReturnValueOnce(createAlbumQuery())
})

describe('listAdminMusic', () => {
  it('should report a release blocker when any album track lacks an active asset', async () => {
    readSelect
      .mockReturnValueOnce(
        createOrderedQuery([
          {coverFallback: 'music', coverImageUrl: null, id: 'album-1', status: 'draft'},
        ]),
      )
      .mockReturnValueOnce(createOrderedQuery([]))
      .mockReturnValueOnce(
        createJoinedOrderedQuery(
          [
            {albumId: 'album-1', artist: 'Artist', id: 'track-1', position: 0, title: 'One'},
            {albumId: 'album-1', artist: 'Artist', id: 'track-2', position: 1, title: 'Two'},
          ],
          1,
        ),
      )
      .mockReturnValueOnce(
        createOrderedQuery([{id: 'asset-1', status: 'active', trackId: 'track-1'}]),
      )
      .mockReturnValueOnce(createJoinedOrderedQuery([], 2))

    await expect(listAdminMusic()).resolves.toMatchObject({
      albums: [
        {
          id: 'album-1',
          release: {blockers: ['tracks_missing_active_asset'], ready: false},
        },
      ],
      tracks: [{id: 'track-1'}, {id: 'track-2'}],
    })
  })
})

describe('updateAlbumStatus', () => {
  it('should block publishing when any album track lacks an active asset', async () => {
    select.mockReturnValueOnce(
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
    expect(update).not.toHaveBeenCalled()
  })

  it('should publish when every album track has an active asset', async () => {
    select.mockReturnValueOnce(
      createTracksQuery([
        {activeAssetTrackId: 'track-1', trackId: 'track-1'},
        {activeAssetTrackId: 'track-2', trackId: 'track-2'},
      ]),
    )

    await expect(updateAlbumStatus('album-1', 'publish')).resolves.toEqual({
      status: 'published',
      success: true,
    })
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('should count duplicate active assets as one covered track', async () => {
    select.mockReturnValueOnce(
      createTracksQuery([
        {activeAssetTrackId: 'track-1', trackId: 'track-1'},
        {activeAssetTrackId: 'track-1', trackId: 'track-1'},
        {activeAssetTrackId: 'track-2', trackId: 'track-2'},
      ]),
    )

    await expect(updateAlbumStatus('album-1', 'publish')).resolves.toEqual({
      status: 'published',
      success: true,
    })
    expect(update).toHaveBeenCalledTimes(1)
  })
})
