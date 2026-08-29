import {beforeEach, describe, expect, it, vi} from 'vitest'

const reservationMocks = vi.hoisted(() => ({
  finalizeAlbumCoverDeletion: vi.fn(),
  listAlbumCoverCleanupCandidates: vi.fn(),
  prepareAlbumCoverDeletion: vi.fn(),
}))
const storageMocks = vi.hoisted(() => ({deleteAlbumCover: vi.fn()}))

vi.mock('../album-cover-reservation', () => reservationMocks)
vi.mock('../cover-upload', () => storageMocks)

import {
  runAlbumCoverMaintenance,
  type AlbumCoverMaintenanceRepository,
} from '../album-cover-maintenance'

const NOW = new Date('2026-08-30T00:00:00.000Z')
const createRepository = (): AlbumCoverMaintenanceRepository => ({
  deleteStorage: vi.fn().mockResolvedValue(undefined),
  finalize: vi.fn().mockResolvedValue(true),
  listCandidates: vi.fn().mockResolvedValue([]),
  prepare: vi.fn().mockImplementation(async (id) => `album-covers/${id}/cover.webp`),
})

beforeEach(() => {
  reservationMocks.listAlbumCoverCleanupCandidates.mockReset().mockResolvedValue([{id: 'cover-1'}])
  reservationMocks.prepareAlbumCoverDeletion
    .mockReset()
    .mockResolvedValue('album-covers/cover-1/cover.webp')
  reservationMocks.finalizeAlbumCoverDeletion.mockReset().mockResolvedValue(true)
  storageMocks.deleteAlbumCover.mockReset().mockResolvedValue(undefined)
})

describe('runAlbumCoverMaintenance', () => {
  it('should delete and finalize an expired cover with the default repository', async () => {
    await expect(runAlbumCoverMaintenance({now: NOW})).resolves.toEqual({
      complete: true,
      finalized: 1,
    })
    expect(reservationMocks.listAlbumCoverCleanupCandidates).toHaveBeenCalledWith(NOW, 26)
    expect(storageMocks.deleteAlbumCover).toHaveBeenCalledWith('album-covers/cover-1/cover.webp')
    expect(reservationMocks.finalizeAlbumCoverDeletion).toHaveBeenCalledWith('cover-1')
  })

  it('should skip a reservation claimed by another transaction', async () => {
    const repository = createRepository()
    vi.mocked(repository.listCandidates).mockResolvedValue([{id: 'cover-1'}])
    vi.mocked(repository.prepare).mockResolvedValue(null)

    await expect(runAlbumCoverMaintenance({now: NOW, repository})).resolves.toEqual({
      complete: true,
      finalized: 0,
    })
    expect(repository.deleteStorage).not.toHaveBeenCalled()
  })

  it('should process only a bounded batch and report remaining work', async () => {
    const repository = createRepository()
    vi.mocked(repository.listCandidates).mockResolvedValue(
      Array.from({length: 26}, (_, index) => ({id: `cover-${index}`})),
    )

    await expect(runAlbumCoverMaintenance({now: NOW, repository})).resolves.toEqual({
      complete: false,
      finalized: 25,
    })
    expect(repository.finalize).toHaveBeenCalledTimes(25)
  })

  it('should reject an oversized repository response', async () => {
    const repository = createRepository()
    vi.mocked(repository.listCandidates).mockResolvedValue(
      Array.from({length: 27}, (_, index) => ({id: `cover-${index}`})),
    )

    await expect(runAlbumCoverMaintenance({now: NOW, repository})).rejects.toThrow(
      'Album cover maintenance repository exceeded the requested limit',
    )
    expect(repository.prepare).not.toHaveBeenCalled()
  })

  it('should continue later cleanups before reporting failures', async () => {
    const repository = createRepository()
    vi.mocked(repository.listCandidates).mockResolvedValue([{id: 'cover-1'}, {id: 'cover-2'}])
    vi.mocked(repository.deleteStorage).mockImplementation((objectKey) =>
      objectKey.includes('cover-1')
        ? Promise.reject(new Error('R2 unavailable'))
        : Promise.resolve(),
    )

    await expect(runAlbumCoverMaintenance({now: NOW, repository})).rejects.toThrow(
      'One or more album cover cleanups failed',
    )
    expect(repository.prepare).toHaveBeenCalledTimes(2)
    expect(repository.finalize).toHaveBeenCalledOnce()
  })
})
