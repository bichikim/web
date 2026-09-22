import {and, eq, sql} from 'drizzle-orm'

import {
  aiConcurrencyBuckets,
  aiConcurrencyReservations,
  aiConcurrencyScopeEnum,
  aiJobs,
  getDatabase,
  type TransactionalDatabase,
  withTransactionalDatabase,
} from 'src/server/database'
import {AI_OPERATIONAL_LIMITS} from 'src/server/ai/policy'

import {type AiJobRecord} from './shared'

type AiConcurrencyScope = (typeof aiConcurrencyScopeEnum.enumValues)[number]
export type AiRunnerKind = 'local-runner' | 'openai'
export type AiTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]

interface AiConcurrencyScopeDefinition {
  readonly limitUnits: number
  readonly scope: AiConcurrencyScope
  readonly scopeKey: string
  readonly userId?: string
}

const getConcurrencyScopes = (
  job: Pick<AiJobRecord, 'capability' | 'userId'>,
  runner: AiRunnerKind,
): ReadonlyArray<AiConcurrencyScopeDefinition> => [
  {
    limitUnits: AI_OPERATIONAL_LIMITS.userRunningJobs,
    scope: 'user',
    scopeKey: `user:${job.userId}`,
    userId: job.userId,
  },
  ...(job.capability === 'image' || job.capability === 'sound'
    ? [
        {
          limitUnits: AI_OPERATIONAL_LIMITS.mediaRunningJobsPerUser,
          scope: 'media' as const,
          scopeKey: `media:${job.userId}`,
          userId: job.userId,
        },
      ]
    : []),
  ...(runner === 'local-runner'
    ? [
        {
          limitUnits: AI_OPERATIONAL_LIMITS.runnerInferenceConcurrency,
          scope: 'runner' as const,
          scopeKey: 'runner:default',
        },
      ]
    : []),
]

export const releaseAiJobConcurrencyInTransaction = async (
  transaction: AiTransaction,
  jobId: string,
): Promise<void> => {
  const reservations = await transaction
    .select()
    .from(aiConcurrencyReservations)
    .where(eq(aiConcurrencyReservations.jobId, jobId))

  for (const reservation of reservations) {
    // oxlint-disable-next-line no-await-in-loop -- Each update releases one reservation in the same transaction.
    await transaction
      .update(aiConcurrencyBuckets)
      .set({
        runningUnits: sql`greatest(${aiConcurrencyBuckets.runningUnits} - ${reservation.units}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(aiConcurrencyBuckets.scopeKey, reservation.scopeKey))
  }

  await transaction
    .delete(aiConcurrencyReservations)
    .where(eq(aiConcurrencyReservations.jobId, jobId))
}

/** Reserves execution slots independently from monthly credit reservations. */
export const reserveAiJobConcurrency = async (
  job: Pick<AiJobRecord, 'capability' | 'id' | 'userId'>,
  runner: AiRunnerKind,
): Promise<boolean> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [currentJob] = await transaction
        .select({status: aiJobs.status, submissionState: aiJobs.submissionState})
        .from(aiJobs)
        .where(eq(aiJobs.id, job.id))
        .for('update')
        .limit(1)

      if (currentJob === undefined) {
        return false
      }

      const existing = await transaction
        .select()
        .from(aiConcurrencyReservations)
        .where(eq(aiConcurrencyReservations.jobId, job.id))

      if (existing.length > 0) {
        return true
      }
      if (currentJob.status !== 'queued' || currentJob.submissionState !== 'unknown') {
        return false
      }

      const scopes = getConcurrencyScopes(job, runner)
      for (const scope of scopes) {
        // oxlint-disable-next-line no-await-in-loop -- Bucket creation must stay in this transaction.
        await transaction
          .insert(aiConcurrencyBuckets)
          .values({
            limitUnits: scope.limitUnits,
            scope: scope.scope,
            scopeKey: scope.scopeKey,
            userId: scope.userId,
          })
          .onConflictDoNothing()
      }

      const reservedScopes: Array<AiConcurrencyScopeDefinition> = []
      for (const scope of scopes) {
        // oxlint-disable-next-line no-await-in-loop -- Conditional slot updates must serialize per scope.
        const [reserved] = await transaction
          .update(aiConcurrencyBuckets)
          .set({
            runningUnits: sql`${aiConcurrencyBuckets.runningUnits} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(aiConcurrencyBuckets.scopeKey, scope.scopeKey),
              sql`${aiConcurrencyBuckets.runningUnits} + 1 <= ${aiConcurrencyBuckets.limitUnits}`,
            ),
          )
          .returning({scopeKey: aiConcurrencyBuckets.scopeKey})

        if (reserved === undefined) {
          for (const reservedScope of reservedScopes) {
            // oxlint-disable-next-line no-await-in-loop -- Roll back only the slots acquired by this transaction.
            await transaction
              .update(aiConcurrencyBuckets)
              .set({
                runningUnits: sql`greatest(${aiConcurrencyBuckets.runningUnits} - 1, 0)`,
                updatedAt: new Date(),
              })
              .where(eq(aiConcurrencyBuckets.scopeKey, reservedScope.scopeKey))
          }
          return false
        }

        reservedScopes.push(scope)
      }

      await transaction.insert(aiConcurrencyReservations).values(
        scopes.map((scope) => ({
          jobId: job.id,
          scope: scope.scope,
          scopeKey: scope.scopeKey,
        })),
      )
      return true
    }),
  )

export const releaseAiJobConcurrency = (jobId: string): Promise<void> =>
  withTransactionalDatabase((database) =>
    database.transaction((transaction) => releaseAiJobConcurrencyInTransaction(transaction, jobId)),
  )
