import {and, isNotNull, isNull, lte, or, sql} from 'drizzle-orm'

import {type Database, getDatabase, pomoAccountLinkChallenges, pomoAppSessions} from '../database'
import type {AuthMaintenanceBatchResult, AuthMaintenanceRepository} from './maintenance'

const BATCH_LOOKAHEAD = 1

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

interface BatchResultRow extends Record<string, unknown> {
  readonly deleted: number
  readonly hasMore: boolean
}

const getBatchResult = (rows: ReadonlyArray<BatchResultRow>): AuthMaintenanceBatchResult => {
  const [result] = rows

  if (result === undefined) {
    throw new Error('Auth maintenance deletion did not return a batch result')
  }

  return result
}

/** Creates the PostgreSQL adapter used by authentication maintenance. */
export const createAuthMaintenanceRepository = (
  database: Database = getDatabase(),
): AuthMaintenanceRepository => ({
  async deleteAccountLinkChallengeBatch(options: DeleteBatchOptions) {
    const result = await database.execute<BatchResultRow>(sql`
      with candidates as (
        select ${pomoAccountLinkChallenges.id}
        from ${pomoAccountLinkChallenges}
        where ${lte(pomoAccountLinkChallenges.expiresAt, options.cutoff)}
        limit ${options.batchSize + BATCH_LOOKAHEAD}
        for update skip locked
      ), deletion_candidates as (
        select id from candidates limit ${options.batchSize}
      ), deleted as (
        delete from ${pomoAccountLinkChallenges}
        using deletion_candidates
        where ${pomoAccountLinkChallenges.id} = deletion_candidates.id
        returning ${pomoAccountLinkChallenges.id}
      )
      select
        count(*)::integer as "deleted",
        (select count(*) from candidates) > ${options.batchSize} as "hasMore"
      from deleted
    `)

    return getBatchResult(result.rows)
  },
  async deleteAppSessionBatch(options: DeleteAppSessionBatchOptions) {
    const result = await database.execute<BatchResultRow>(sql`
      with candidates as (
        select ${pomoAppSessions.id}
        from ${pomoAppSessions}
        where ${or(
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
        )}
        limit ${options.batchSize + BATCH_LOOKAHEAD}
        for update skip locked
      ), deletion_candidates as (
        select id from candidates limit ${options.batchSize}
      ), deleted as (
        delete from ${pomoAppSessions}
        using deletion_candidates
        where ${pomoAppSessions.id} = deletion_candidates.id
        returning ${pomoAppSessions.id}
      )
      select
        count(*)::integer as "deleted",
        (select count(*) from candidates) > ${options.batchSize} as "hasMore"
      from deleted
    `)

    return getBatchResult(result.rows)
  },
})
