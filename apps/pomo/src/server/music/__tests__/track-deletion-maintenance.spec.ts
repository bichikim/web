import {describe, expect, it, vi} from 'vitest'

import {
  runTrackDeletionMaintenance,
  type TrackDeletionCandidate,
  type TrackDeletionMaintenanceRepository,
} from '../track-deletion-maintenance'

const createRepository = (): TrackDeletionMaintenanceRepository => ({
  deleteStorage: vi.fn().mockResolvedValue(undefined),
  finalize: vi.fn().mockResolvedValue(true),
  listPending: vi.fn().mockResolvedValue([]),
  markStorageDeleted: vi.fn().mockResolvedValue(true),
})

const createCandidate = (trackId: string, storageDeleted = true): TrackDeletionCandidate => ({
  objectKeys: [`tracks/${trackId}/asset/source.mp3`],
  storageDeleted,
  trackId,
})

describe('runTrackDeletionMaintenance', () => {
  it('should finalize every eligible deletion and report complete', async () => {
    const repository = createRepository()
    vi.mocked(repository.listPending).mockResolvedValue([
      createCandidate('track-1'),
      createCandidate('track-2'),
    ])

    await expect(runTrackDeletionMaintenance(repository)).resolves.toEqual({
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

    await expect(runTrackDeletionMaintenance(repository)).resolves.toEqual({
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

    await expect(runTrackDeletionMaintenance(repository)).resolves.toEqual({
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

    await expect(runTrackDeletionMaintenance(repository)).resolves.toEqual({
      complete: true,
      finalized: 0,
    })
  })

  it('should reject an invalid repository response', async () => {
    const repository = createRepository()
    vi.mocked(repository.listPending).mockResolvedValue(
      Array.from({length: 27}, (_, index) => createCandidate(`track-${index}`)),
    )

    await expect(runTrackDeletionMaintenance(repository)).rejects.toThrow(
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

    await expect(runTrackDeletionMaintenance(repository)).rejects.toThrow(
      'One or more music track deletions failed',
    )
    expect(repository.finalize).toHaveBeenCalledTimes(2)
  })
})
