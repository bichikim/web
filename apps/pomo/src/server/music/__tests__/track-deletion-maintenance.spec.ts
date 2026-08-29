import {beforeEach, describe, expect, it, vi} from 'vitest'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn()}))
const deletionMocks = vi.hoisted(() => ({
  finalizeTrackDeletion: vi.fn(),
  markTrackDeletionStorageDeleted: vi.fn(),
  prepareTrackDeletion: vi.fn(),
}))
const storageMocks = vi.hoisted(() => ({deleteTrackAssetStorage: vi.fn()}))

vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')

  return {...actual, getDatabase: databaseMocks.getDatabase}
})
vi.mock('../track-deletion-repository', () => deletionMocks)
vi.mock('../track-storage-deletion', () => storageMocks)

import {
  runTrackDeletionMaintenance,
  type TrackDeletionCandidate,
  type TrackDeletionMaintenanceRepository,
} from '../track-deletion-maintenance'

const createRepository = (): TrackDeletionMaintenanceRepository => ({
  deleteStorage: vi.fn().mockResolvedValue(undefined),
  finalize: vi.fn().mockResolvedValue(true),
  listPending: vi.fn().mockResolvedValue([]),
  listStale: vi.fn().mockResolvedValue([]),
  markStorageDeleted: vi.fn().mockResolvedValue(true),
  prepareStale: vi.fn().mockResolvedValue(true),
})

const createCandidate = (trackId: string, storageDeleted = true): TrackDeletionCandidate => ({
  objectKeys: [`tracks/${trackId}/asset/source.mp3`],
  storageDeleted,
  trackId,
})

beforeEach(() => {
  databaseMocks.getDatabase.mockReset()
  deletionMocks.finalizeTrackDeletion.mockReset().mockResolvedValue(true)
  deletionMocks.markTrackDeletionStorageDeleted.mockReset().mockResolvedValue(true)
  deletionMocks.prepareTrackDeletion.mockReset().mockResolvedValue({})
  storageMocks.deleteTrackAssetStorage.mockReset().mockResolvedValue(undefined)
})

describe('runTrackDeletionMaintenance', () => {
  it('should use the default database repository to prepare and finish deletions', async () => {
    const now = new Date('2026-08-25T09:00:00.000Z')
    const staleLimit = vi.fn().mockResolvedValue([{trackId: 'stale-track'}])
    const staleOrderBy = vi.fn(() => ({limit: staleLimit}))
    const staleWhere = vi.fn(() => ({orderBy: staleOrderBy}))
    const pendingLimit = vi.fn().mockResolvedValue([
      {
        objectKeys: ['tracks/track-1/asset/source.mp3', 'tracks/track-1/asset/preview.mp3'],
        storageDeletedAt: null,
        trackId: 'track-1',
      },
      {
        objectKeys: ['tracks/track-2/asset/source.mp3'],
        storageDeletedAt: new Date('2026-08-25T08:00:00.000Z'),
        trackId: 'track-2',
      },
    ])
    const pendingOrderBy = vi.fn(() => ({limit: pendingLimit}))
    const select = vi
      .fn()
      .mockReturnValueOnce({from: vi.fn(() => ({where: staleWhere}))})
      .mockReturnValueOnce({from: vi.fn(() => ({orderBy: pendingOrderBy}))})
    databaseMocks.getDatabase.mockReturnValue({select})

    await expect(runTrackDeletionMaintenance({now})).resolves.toEqual({
      complete: true,
      finalized: 2,
    })
    expect(databaseMocks.getDatabase).toHaveBeenCalledTimes(2)
    expect(staleLimit).toHaveBeenCalledExactlyOnceWith(26)
    expect(deletionMocks.prepareTrackDeletion).toHaveBeenCalledExactlyOnceWith('stale-track', {
      staleBefore: new Date('2026-08-24T09:00:00.000Z'),
    })
    expect(pendingLimit).toHaveBeenCalledExactlyOnceWith(26)
    expect(storageMocks.deleteTrackAssetStorage).toHaveBeenNthCalledWith(
      1,
      'tracks/track-1/asset/source.mp3',
    )
    expect(storageMocks.deleteTrackAssetStorage).toHaveBeenNthCalledWith(
      2,
      'tracks/track-1/asset/preview.mp3',
    )
    expect(deletionMocks.markTrackDeletionStorageDeleted).toHaveBeenCalledExactlyOnceWith('track-1')
    expect(deletionMocks.finalizeTrackDeletion).toHaveBeenNthCalledWith(1, 'track-1')
    expect(deletionMocks.finalizeTrackDeletion).toHaveBeenNthCalledWith(2, 'track-2')
  })

  it('should finalize every eligible deletion and report complete', async () => {
    const repository = createRepository()
    vi.mocked(repository.listPending).mockResolvedValue([
      createCandidate('track-1'),
      createCandidate('track-2'),
    ])

    await expect(runTrackDeletionMaintenance({repository})).resolves.toEqual({
      complete: true,
      finalized: 2,
    })
    expect(repository.listPending).toHaveBeenCalledExactlyOnceWith(26)
    expect(repository.deleteStorage).not.toHaveBeenCalled()
    expect(repository.markStorageDeleted).not.toHaveBeenCalled()
    expect(repository.finalize).toHaveBeenNthCalledWith(1, 'track-1')
    expect(repository.finalize).toHaveBeenNthCalledWith(2, 'track-2')
  })

  it('should resume storage deletion before finalizing an incomplete job', async () => {
    const repository = createRepository()
    const candidate = createCandidate('track-1', false)
    vi.mocked(repository.listPending).mockResolvedValue([candidate])

    await expect(runTrackDeletionMaintenance({repository})).resolves.toEqual({
      complete: true,
      finalized: 1,
    })
    expect(repository.deleteStorage).toHaveBeenCalledExactlyOnceWith(candidate.objectKeys)
    expect(repository.markStorageDeleted).toHaveBeenCalledExactlyOnceWith('track-1')
    expect(repository.finalize).toHaveBeenCalledExactlyOnceWith('track-1')
  })

  it('should stop at the bounded batch size and report remaining work', async () => {
    const repository = createRepository()
    const candidates = Array.from({length: 26}, (_, index) => createCandidate(`track-${index}`))
    vi.mocked(repository.listPending).mockResolvedValue(candidates)

    await expect(runTrackDeletionMaintenance({repository})).resolves.toEqual({
      complete: false,
      finalized: 25,
    })
    expect(repository.finalize).toHaveBeenCalledTimes(25)
    expect(repository.finalize).not.toHaveBeenCalledWith('track-25')
  })

  it('should tolerate an idempotent finalization completed by another invocation', async () => {
    const repository = createRepository()
    vi.mocked(repository.listPending).mockResolvedValue([createCandidate('track-1')])
    vi.mocked(repository.finalize).mockResolvedValue(false)

    await expect(runTrackDeletionMaintenance({repository})).resolves.toEqual({
      complete: true,
      finalized: 0,
    })
  })

  it('should reject an invalid repository response', async () => {
    const repository = createRepository()
    vi.mocked(repository.listPending).mockResolvedValue(
      Array.from({length: 27}, (_, index) => createCandidate(`track-${index}`)),
    )

    await expect(runTrackDeletionMaintenance({repository})).rejects.toThrow(
      'Track deletion maintenance repository exceeded the requested limit',
    )
    expect(repository.finalize).not.toHaveBeenCalled()
  })

  it('should continue later jobs before reporting a failed cron run', async () => {
    const repository = createRepository()
    vi.mocked(repository.listPending).mockResolvedValue([
      createCandidate('track-1'),
      createCandidate('track-2'),
    ])
    vi.mocked(repository.finalize).mockImplementation((trackId) =>
      trackId === 'track-1'
        ? Promise.reject(new Error('database unavailable'))
        : Promise.resolve(true),
    )

    await expect(runTrackDeletionMaintenance({repository})).rejects.toThrow(
      'One or more music track deletions failed',
    )
    expect(repository.finalize).toHaveBeenCalledTimes(2)
  })

  it('should prepare stale registrations before processing deletion jobs', async () => {
    const repository = createRepository()
    const now = new Date('2026-08-25T09:00:00.000Z')
    vi.mocked(repository.listStale).mockResolvedValue([{trackId: 'track-1'}])

    await expect(runTrackDeletionMaintenance({now, repository})).resolves.toEqual({
      complete: true,
      finalized: 0,
    })
    expect(repository.listStale).toHaveBeenCalledExactlyOnceWith(
      new Date('2026-08-24T09:00:00.000Z'),
      26,
    )
    expect(repository.prepareStale).toHaveBeenCalledExactlyOnceWith(
      'track-1',
      new Date('2026-08-24T09:00:00.000Z'),
    )
  })

  it('should reject an oversized stale registration response', async () => {
    const repository = createRepository()
    vi.mocked(repository.listStale).mockResolvedValue(
      Array.from({length: 27}, (_, index) => ({trackId: `track-${index}`})),
    )

    await expect(runTrackDeletionMaintenance({repository})).rejects.toThrow(
      'Track registration maintenance repository exceeded the requested limit',
    )
    expect(repository.listPending).not.toHaveBeenCalled()
  })

  it('should continue preparing stale registrations before reporting failures', async () => {
    const repository = createRepository()
    vi.mocked(repository.listStale).mockResolvedValue([{trackId: 'track-1'}, {trackId: 'track-2'}])
    vi.mocked(repository.prepareStale).mockImplementation((trackId) =>
      trackId === 'track-1'
        ? Promise.reject(new Error('database unavailable'))
        : Promise.resolve(true),
    )

    await expect(runTrackDeletionMaintenance({repository})).rejects.toThrow(
      'One or more music track deletions failed',
    )
    expect(repository.prepareStale).toHaveBeenCalledTimes(2)
    expect(repository.listPending).toHaveBeenCalledOnce()
  })
})
