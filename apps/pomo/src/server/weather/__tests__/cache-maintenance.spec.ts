import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const repositoryMocks = vi.hoisted(() => ({
  createWeatherCacheMaintenanceRepository: vi.fn(),
}))

vi.mock('../cache-maintenance-repository', () => repositoryMocks)

import {
  runWeatherCacheMaintenance,
  type WeatherCacheMaintenanceRepository,
} from '../cache-maintenance'

const NOW = new Date('2026-08-30T18:57:00.000Z')
const CUTOFF = new Date('2026-08-29T18:57:00.000Z')

const createRepository = (): WeatherCacheMaintenanceRepository => ({
  deleteWeatherBatch: vi.fn().mockResolvedValue({deleted: 0, hasMore: false}),
})

describe('runWeatherCacheMaintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should use the current time and database repository by default', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    const repository = createRepository()
    repositoryMocks.createWeatherCacheMaintenanceRepository.mockReturnValue(repository)

    await runWeatherCacheMaintenance()

    expect(repositoryMocks.createWeatherCacheMaintenanceRepository).toHaveBeenCalledOnce()
    expect(repository.deleteWeatherBatch).toHaveBeenCalledExactlyOnceWith({
      batchSize: 500,
      cutoff: CUTOFF,
    })
  })

  it('should delete observations collected at least 24 hours ago in bounded batches', async () => {
    const repository = createRepository()

    await runWeatherCacheMaintenance({now: () => NOW, repository})

    expect(repository.deleteWeatherBatch).toHaveBeenCalledExactlyOnceWith({
      batchSize: 500,
      cutoff: CUTOFF,
    })
  })

  it('should be idempotent when repeated after eligible observations are deleted', async () => {
    let remaining = 2
    const repository: WeatherCacheMaintenanceRepository = {
      deleteWeatherBatch: vi.fn(async () => {
        const deleted = remaining
        remaining = 0
        return {deleted, hasMore: false}
      }),
    }

    await expect(runWeatherCacheMaintenance({now: () => NOW, repository})).resolves.toEqual({
      complete: true,
      deleted: 2,
    })
    await expect(runWeatherCacheMaintenance({now: () => NOW, repository})).resolves.toEqual({
      complete: true,
      deleted: 0,
    })
  })

  it('should stop at the batch limit and report incomplete work', async () => {
    const repository = createRepository()
    vi.mocked(repository.deleteWeatherBatch).mockResolvedValue({deleted: 500, hasMore: true})

    await expect(runWeatherCacheMaintenance({now: () => NOW, repository})).resolves.toEqual({
      complete: false,
      deleted: 10_000,
    })
    expect(repository.deleteWeatherBatch).toHaveBeenCalledTimes(20)
  })

  it('should report complete when the final eligible count exactly matches the batch limit', async () => {
    const repository = createRepository()
    let batch = 0
    vi.mocked(repository.deleteWeatherBatch).mockImplementation(async () => {
      batch += 1
      return {deleted: 500, hasMore: batch < 20}
    })

    await expect(runWeatherCacheMaintenance({now: () => NOW, repository})).resolves.toEqual({
      complete: true,
      deleted: 10_000,
    })
    expect(repository.deleteWeatherBatch).toHaveBeenCalledTimes(20)
  })

  it('should propagate a repository failure', () => {
    const repository = createRepository()
    vi.mocked(repository.deleteWeatherBatch).mockRejectedValue(new Error('database unavailable'))

    return expect(runWeatherCacheMaintenance({now: () => NOW, repository})).rejects.toThrow(
      'database unavailable',
    )
  })

  it.each([
    {deleted: -1, hasMore: false},
    {deleted: 501, hasMore: false},
    {deleted: 499, hasMore: true},
  ])('should reject an invalid repository batch %#', async (batchResult) => {
    const repository = createRepository()
    vi.mocked(repository.deleteWeatherBatch).mockResolvedValue(batchResult)

    await expect(runWeatherCacheMaintenance({now: () => NOW, repository})).rejects.toThrow(
      'Weather cache maintenance repository returned an invalid batch count',
    )
  })
})
