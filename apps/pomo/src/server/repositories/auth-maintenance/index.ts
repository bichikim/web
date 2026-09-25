import {deleteLockedBatch} from '../../database/delete-locked-batch'
import {and, isNotNull, isNull, lte, or, sql} from 'drizzle-orm'

import {
  type Database,
  getDatabase,
  pomoAccountLinkChallenges,
  pomoAppSessions,
} from '../../database'

interface DeleteBatchOptions {
  readonly batchSize: number
  readonly cutoff: Date
}

interface DeleteAppSessionBatchOptions {
  readonly batchSize: number
  readonly expiresAtCutoff: Date
  readonly pendingExpiresAtCutoff: Date
  readonly revokedAtCutoff: Date
}

export interface AuthMaintenanceBatchResult {
  readonly deleted: number
  readonly hasMore: boolean
}

export interface AuthMaintenanceRepository {
  readonly deleteAccountLinkChallengeBatch: (
    options: DeleteBatchOptions,
  ) => Promise<AuthMaintenanceBatchResult>
  readonly deleteAppSessionBatch: (
    options: DeleteAppSessionBatchOptions,
  ) => Promise<AuthMaintenanceBatchResult>
}

/** Creates the PostgreSQL adapter used by authentication maintenance. */
export const createAuthMaintenanceRepository = (
  database: Database = getDatabase(),
): AuthMaintenanceRepository => ({
  deleteAccountLinkChallengeBatch(options: DeleteBatchOptions) {
    return deleteLockedBatch(database, {
      batchSize: options.batchSize,
      emptyResultMessage: 'Auth maintenance deletion did not return a batch result',
      id: pomoAccountLinkChallenges.id,
      table: pomoAccountLinkChallenges,
      where: lte(pomoAccountLinkChallenges.expiresAt, options.cutoff),
    })
  },
  deleteAppSessionBatch(options: DeleteAppSessionBatchOptions) {
    return deleteLockedBatch(database, {
      batchSize: options.batchSize,
      emptyResultMessage: 'Auth maintenance deletion did not return a batch result',
      id: pomoAppSessions.id,
      table: pomoAppSessions,
      where: sql`${or(
        and(
          isNull(pomoAppSessions.revokedAt),
          isNotNull(pomoAppSessions.activatedAt),
          lte(pomoAppSessions.expiresAt, options.expiresAtCutoff),
        ),
        and(
          isNull(pomoAppSessions.revokedAt),
          isNull(pomoAppSessions.activatedAt),
          lte(pomoAppSessions.expiresAt, options.pendingExpiresAtCutoff),
        ),
        lte(pomoAppSessions.revokedAt, options.revokedAtCutoff),
      )}`,
    })
  },
})
