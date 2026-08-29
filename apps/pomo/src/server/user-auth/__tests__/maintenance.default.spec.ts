import {expect, it, vi} from 'vitest'

const repositoryMocks = vi.hoisted(() => ({
  createAuthMaintenanceRepository: vi.fn(),
  deleteAccountLinkChallengeBatch: vi.fn(),
  deleteAppSessionBatch: vi.fn(),
}))

vi.mock('../maintenance-repository', () => ({
  createAuthMaintenanceRepository: repositoryMocks.createAuthMaintenanceRepository,
}))

import {runAuthMaintenance} from '../maintenance'

it('should create default runtime dependencies when none are supplied', async () => {
  repositoryMocks.deleteAccountLinkChallengeBatch.mockResolvedValue({
    deleted: 0,
    hasMore: false,
  })
  repositoryMocks.deleteAppSessionBatch.mockResolvedValue({deleted: 0, hasMore: false})
  repositoryMocks.createAuthMaintenanceRepository.mockReturnValue({
    deleteAccountLinkChallengeBatch: repositoryMocks.deleteAccountLinkChallengeBatch,
    deleteAppSessionBatch: repositoryMocks.deleteAppSessionBatch,
  })
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-24T18:17:00.000Z'))

  await expect(runAuthMaintenance()).resolves.toMatchObject({complete: true})
  expect(repositoryMocks.createAuthMaintenanceRepository).toHaveBeenCalledOnce()

  vi.useRealTimers()
})
