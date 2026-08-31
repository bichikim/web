import {beforeEach, describe, expect, it, vi} from 'vitest'

import {type AuthMaintenanceRepository, runAuthMaintenance} from '../maintenance'

vi.mock('src/env', () => ({env: {}}))

const NOW = new Date('2026-08-24T18:17:00.000Z')
const EXPIRED_SESSION_CUTOFF = new Date('2026-08-23T18:17:00.000Z')
const REVOKED_SESSION_CUTOFF = new Date('2026-08-17T18:17:00.000Z')
const CHALLENGE_CUTOFF = new Date('2026-08-24T17:17:00.000Z')

const createRepository = (): AuthMaintenanceRepository => ({
  deleteAccountLinkChallengeBatch: vi.fn().mockResolvedValue({deleted: 0, hasMore: false}),
  deleteAppSessionBatch: vi.fn().mockResolvedValue({deleted: 0, hasMore: false}),
})

describe('runAuthMaintenance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fix the retention cutoffs and batch size at the policy boundary', async () => {
    const repository = createRepository()

    await runAuthMaintenance({now: () => NOW, repository})

    expect(repository.deleteAppSessionBatch).toHaveBeenCalledExactlyOnceWith({
      batchSize: 500,
      expiresAtCutoff: EXPIRED_SESSION_CUTOFF,
      revokedAtCutoff: REVOKED_SESSION_CUTOFF,
    })
    expect(repository.deleteAccountLinkChallengeBatch).toHaveBeenCalledExactlyOnceWith({
      batchSize: 500,
      cutoff: CHALLENGE_CUTOFF,
    })
  })

  it('should delete records at or before each cutoff while preserving newer active data', async () => {
    const sessions = [
      {expiresAt: new Date(EXPIRED_SESSION_CUTOFF.getTime() - 1), revokedAt: null},
      {expiresAt: EXPIRED_SESSION_CUTOFF, revokedAt: null},
      {expiresAt: new Date(EXPIRED_SESSION_CUTOFF.getTime() + 1), revokedAt: null},
      {expiresAt: new Date('2026-09-01T00:00:00.000Z'), revokedAt: REVOKED_SESSION_CUTOFF},
      {
        expiresAt: new Date('2026-09-01T00:00:00.000Z'),
        revokedAt: new Date(REVOKED_SESSION_CUTOFF.getTime() + 1),
      },
      {
        expiresAt: new Date(EXPIRED_SESSION_CUTOFF.getTime() - 1),
        revokedAt: new Date(REVOKED_SESSION_CUTOFF.getTime() + 1),
      },
      {expiresAt: new Date('2026-09-01T00:00:00.000Z'), revokedAt: null},
    ]
    const challenges = [
      {consumedAt: null, expiresAt: new Date(CHALLENGE_CUTOFF.getTime() - 1)},
      {consumedAt: NOW, expiresAt: CHALLENGE_CUTOFF},
      {consumedAt: NOW, expiresAt: new Date(CHALLENGE_CUTOFF.getTime() + 1)},
      {consumedAt: null, expiresAt: new Date('2026-08-24T18:30:00.000Z')},
    ]
    const repository: AuthMaintenanceRepository = {
      async deleteAccountLinkChallengeBatch(options) {
        const deletable = challenges.filter((challenge) => challenge.expiresAt <= options.cutoff)
        challenges.splice(
          0,
          challenges.length,
          ...challenges.filter((challenge) => challenge.expiresAt > options.cutoff),
        )
        return {deleted: deletable.length, hasMore: false}
      },
      async deleteAppSessionBatch(options) {
        const deletable = sessions.filter(
          (session) =>
            (session.revokedAt === null && session.expiresAt <= options.expiresAtCutoff) ||
            (session.revokedAt !== null && session.revokedAt <= options.revokedAtCutoff),
        )
        sessions.splice(
          0,
          sessions.length,
          ...sessions.filter(
            (session) =>
              (session.revokedAt === null && session.expiresAt > options.expiresAtCutoff) ||
              (session.revokedAt !== null && session.revokedAt > options.revokedAtCutoff),
          ),
        )
        return {deleted: deletable.length, hasMore: false}
      },
    }

    const result = await runAuthMaintenance({now: () => NOW, repository})

    expect(result).toEqual({
      accountLinkChallenges: {complete: true, deleted: 2},
      appSessions: {complete: true, deleted: 3},
      complete: true,
    })
    expect(sessions).toHaveLength(4)
    expect(challenges).toHaveLength(2)
  })

  it('should be idempotent when repeated after all eligible records are deleted', async () => {
    let remainingSessions = 1
    let remainingChallenges = 1
    const repository: AuthMaintenanceRepository = {
      deleteAccountLinkChallengeBatch: vi.fn(async () => {
        const deleted = remainingChallenges
        remainingChallenges = 0
        return {deleted, hasMore: false}
      }),
      deleteAppSessionBatch: vi.fn(async () => {
        const deleted = remainingSessions
        remainingSessions = 0
        return {deleted, hasMore: false}
      }),
    }

    await expect(runAuthMaintenance({now: () => NOW, repository})).resolves.toMatchObject({
      accountLinkChallenges: {deleted: 1},
      appSessions: {deleted: 1},
    })
    await expect(runAuthMaintenance({now: () => NOW, repository})).resolves.toEqual({
      accountLinkChallenges: {complete: true, deleted: 0},
      appSessions: {complete: true, deleted: 0},
      complete: true,
    })
  })

  it('should stop at the batch limit and report incomplete work', async () => {
    const repository = createRepository()
    vi.mocked(repository.deleteAppSessionBatch).mockResolvedValue({deleted: 500, hasMore: true})

    const result = await runAuthMaintenance({now: () => NOW, repository})

    expect(result.appSessions).toEqual({complete: false, deleted: 10_000})
    expect(repository.deleteAppSessionBatch).toHaveBeenCalledTimes(20)
    expect(repository.deleteAccountLinkChallengeBatch).toHaveBeenCalledOnce()
  })

  it('should report complete when the final eligible count exactly matches the batch limit', async () => {
    const repository = createRepository()
    let batch = 0
    vi.mocked(repository.deleteAppSessionBatch).mockImplementation(async () => {
      batch += 1
      return {deleted: 500, hasMore: batch < 20}
    })

    const result = await runAuthMaintenance({now: () => NOW, repository})

    expect(result.appSessions).toEqual({complete: true, deleted: 10_000})
    expect(repository.deleteAppSessionBatch).toHaveBeenCalledTimes(20)
  })

  it('should reject when a deletion batch fails', () => {
    const repository = createRepository()
    vi.mocked(repository.deleteAppSessionBatch).mockRejectedValue(new Error('database unavailable'))

    return expect(runAuthMaintenance({now: () => NOW, repository})).rejects.toThrow(
      'database unavailable',
    )
  })

  it.each([
    {deleted: -1, hasMore: false},
    {deleted: 501, hasMore: false},
    {deleted: 499, hasMore: true},
  ])('should reject an invalid repository batch %#', async (batchResult) => {
    const repository = createRepository()
    vi.mocked(repository.deleteAppSessionBatch).mockResolvedValue(batchResult)

    await expect(runAuthMaintenance({now: () => NOW, repository})).rejects.toThrow(
      'Auth maintenance repository returned an invalid batch count',
    )
  })

  it('should report incomplete when challenge cleanup reaches its batch limit', async () => {
    const repository = createRepository()
    vi.mocked(repository.deleteAccountLinkChallengeBatch).mockResolvedValue({
      deleted: 500,
      hasMore: true,
    })

    const result = await runAuthMaintenance({now: () => NOW, repository})

    expect(result.appSessions.complete).toBe(true)
    expect(result.accountLinkChallenges).toEqual({complete: false, deleted: 10_000})
    expect(result.complete).toBe(false)
  })
})
