import {drainLockedBatches, type DrainLockedBatchesResult} from '../database/drain-locked-batches'
import {MILLISECONDS_PER_DAY, MILLISECONDS_PER_HOUR} from 'src/utils/time-units'
import {
  type AuthMaintenanceRepository,
  createAuthMaintenanceRepository,
} from '../repositories/auth-maintenance'

const DAYS_PER_WEEK = 7
const EXPIRED_SESSION_RETENTION = MILLISECONDS_PER_DAY
const REVOKED_SESSION_RETENTION = DAYS_PER_WEEK * MILLISECONDS_PER_DAY
const ACCOUNT_LINK_CHALLENGE_RETENTION = MILLISECONDS_PER_HOUR
const DELETE_BATCH_SIZE = 500
const MAXIMUM_BATCHES = 20

interface AuthMaintenanceDependencies {
  readonly now: () => Date
  readonly repository: AuthMaintenanceRepository
}

type AuthMaintenanceTargetResult = DrainLockedBatchesResult

export interface AuthMaintenanceResult {
  readonly accountLinkChallenges: AuthMaintenanceTargetResult
  readonly appSessions: AuthMaintenanceTargetResult
  readonly complete: boolean
}

const subtractMilliseconds = (date: Date, milliseconds: number): Date =>
  new Date(date.getTime() - milliseconds)

/** Deletes expired authentication data in bounded, idempotent batches. */
export const runAuthMaintenance = async (
  dependencies?: AuthMaintenanceDependencies,
): Promise<AuthMaintenanceResult> => {
  const resolvedDependencies = dependencies ?? {
    now: () => new Date(),
    repository: createAuthMaintenanceRepository(),
  }
  const now = resolvedDependencies.now()
  const expiresAtCutoff = subtractMilliseconds(now, EXPIRED_SESSION_RETENTION)
  const revokedAtCutoff = subtractMilliseconds(now, REVOKED_SESSION_RETENTION)
  const challengeCutoff = subtractMilliseconds(now, ACCOUNT_LINK_CHALLENGE_RETENTION)

  const appSessions = await drainLockedBatches({
    batchSize: DELETE_BATCH_SIZE,
    deleteBatch: () =>
      resolvedDependencies.repository.deleteAppSessionBatch({
        batchSize: DELETE_BATCH_SIZE,
        expiresAtCutoff,
        pendingExpiresAtCutoff: now,
        revokedAtCutoff,
      }),
    invalidCountMessage: 'Auth maintenance repository returned an invalid batch count',
    maximumBatches: MAXIMUM_BATCHES,
  })
  const accountLinkChallenges = await drainLockedBatches({
    batchSize: DELETE_BATCH_SIZE,
    deleteBatch: () =>
      resolvedDependencies.repository.deleteAccountLinkChallengeBatch({
        batchSize: DELETE_BATCH_SIZE,
        cutoff: challengeCutoff,
      }),
    invalidCountMessage: 'Auth maintenance repository returned an invalid batch count',
    maximumBatches: MAXIMUM_BATCHES,
  })

  return {
    accountLinkChallenges,
    appSessions,
    complete: appSessions.complete && accountLinkChallenges.complete,
  }
}
