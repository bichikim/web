import 'server-only'

import {createAuthMaintenanceRepository} from './maintenance-repository'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const DAYS_PER_WEEK = 7
const MILLISECONDS_PER_HOUR = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const EXPIRED_SESSION_RETENTION = HOURS_PER_DAY * MILLISECONDS_PER_HOUR
const REVOKED_SESSION_RETENTION = DAYS_PER_WEEK * HOURS_PER_DAY * MILLISECONDS_PER_HOUR
const ACCOUNT_LINK_CHALLENGE_RETENTION = MILLISECONDS_PER_HOUR
const DELETE_BATCH_SIZE = 500
const MAXIMUM_BATCHES = 20

interface DeleteBatchOptions {
  readonly batchSize: number
  readonly cutoff: Date
}

interface DeleteAppSessionBatchOptions {
  readonly batchSize: number
  readonly expiresAtCutoff: Date
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

interface AuthMaintenanceDependencies {
  readonly now: () => Date
  readonly repository: AuthMaintenanceRepository
}

interface AuthMaintenanceTargetResult {
  readonly complete: boolean
  readonly deleted: number
}

export interface AuthMaintenanceResult {
  readonly accountLinkChallenges: AuthMaintenanceTargetResult
  readonly appSessions: AuthMaintenanceTargetResult
  readonly complete: boolean
}

const subtractMilliseconds = (date: Date, milliseconds: number): Date =>
  new Date(date.getTime() - milliseconds)

const deleteInBatches = async (
  deleteBatch: () => Promise<AuthMaintenanceBatchResult>,
  batch = 0,
  deleted = 0,
): Promise<AuthMaintenanceTargetResult> => {
  if (batch === MAXIMUM_BATCHES) {
    return {complete: false, deleted}
  }

  const {deleted: batchDeleted, hasMore} = await deleteBatch()

  if (
    batchDeleted < 0 ||
    batchDeleted > DELETE_BATCH_SIZE ||
    (hasMore && batchDeleted !== DELETE_BATCH_SIZE)
  ) {
    throw new RangeError('Auth maintenance repository returned an invalid batch count')
  }

  const totalDeleted = deleted + batchDeleted

  return hasMore
    ? deleteInBatches(deleteBatch, batch + 1, totalDeleted)
    : {complete: true, deleted: totalDeleted}
}

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

  const appSessions = await deleteInBatches(() =>
    resolvedDependencies.repository.deleteAppSessionBatch({
      batchSize: DELETE_BATCH_SIZE,
      expiresAtCutoff,
      revokedAtCutoff,
    }),
  )
  const accountLinkChallenges = await deleteInBatches(() =>
    resolvedDependencies.repository.deleteAccountLinkChallengeBatch({
      batchSize: DELETE_BATCH_SIZE,
      cutoff: challengeCutoff,
    }),
  )

  return {
    accountLinkChallenges,
    appSessions,
    complete: appSessions.complete && accountLinkChallenges.complete,
  }
}
