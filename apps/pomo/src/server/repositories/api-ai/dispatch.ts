// oxlint-disable no-await-in-loop -- Pool selection belongs to one serialized database transaction.
import {and, asc, count, eq, sql} from 'drizzle-orm'
import {apiAiAttempts, apiAiJobs, withTransactionalDatabase} from 'src/server/database'
import {API_AI_POLICY} from 'src/server/api-ai/policy'
import type {ApiAiClaim, ApiAiProvider} from 'src/server/api-ai/types'
import {claimProviderAttempt} from './claim-provider-attempt'
import type {ApiAiTransaction, StoredApiAiAttempt, StoredApiAiJob} from './types'

const orderProviders = (
  providers: ReadonlyArray<ApiAiProvider>,
  job: StoredApiAiJob,
  attempts: ReadonlyArray<StoredApiAiAttempt>,
): ReadonlyArray<ApiAiProvider> => {
  const supported = providers.filter((provider) => provider.models[job.kind] !== undefined)
  const untried = supported.filter(
    (provider) => !attempts.some((attempt) => attempt.providerId === provider.id),
  )
  const tried = supported.filter((provider) =>
    attempts.some((attempt) => attempt.providerId === provider.id),
  )
  return [...untried, ...tried]
}

const isUserAtCapacity = async (
  transaction: ApiAiTransaction,
  userId: string,
): Promise<boolean> => {
  const [active] = await transaction
    .select({total: count()})
    .from(apiAiJobs)
    .where(
      and(
        eq(apiAiJobs.ownerId, userId),
        sql`${apiAiJobs.status} in ('submitting', 'running', 'recovery_pending')`,
      ),
    )
  return active.total >= API_AI_POLICY.maximumRunningPerUser
}

interface JobClaimInput {
  readonly transaction: ApiAiTransaction
  readonly jobId: string
  readonly providers: ReadonlyArray<ApiAiProvider>
  readonly now: Date
  readonly attemptId: string
}

const claimInTransaction = async (input: JobClaimInput): Promise<ApiAiClaim | null> => {
  const {transaction, jobId, providers, now, attemptId} = input
  await transaction.execute(sql`select pg_advisory_xact_lock(hashtext('api-ai-dispatch'), 0)`)
  const [job] = await transaction
    .select()
    .from(apiAiJobs)
    .where(eq(apiAiJobs.id, jobId))
    .for('update')
    .limit(1)
  if (job === undefined || job.status !== 'queued' || job.nextAttemptAt > now) {
    return null
  }
  const deadline = job.executionExpiresAt ?? new Date(now.getTime() + job.generationMilliseconds)
  const expired = job.executionExpiresAt === null ? job.queueExpiresAt <= now : deadline <= now
  const attempts = await transaction
    .select()
    .from(apiAiAttempts)
    .where(eq(apiAiAttempts.jobId, job.id))
    .orderBy(asc(apiAiAttempts.createdAt), asc(apiAiAttempts.id))
  if (expired || attempts.length >= API_AI_POLICY.maximumAttempts) {
    await transaction
      .update(apiAiJobs)
      .set({
        completedAt: now,
        errorMessage: expired ? 'AI job deadline exceeded' : 'AI provider attempts exhausted',
        status: 'failed',
      })
      .where(eq(apiAiJobs.id, job.id))
    return null
  }
  const canRun = job.ownerId === null || !(await isUserAtCapacity(transaction, job.ownerId))
  if (canRun) {
    for (const provider of orderProviders(providers, job, attempts)) {
      const claim = await claimProviderAttempt({
        attemptId,
        attempts,
        deadline,
        job,
        now,
        provider,
        transaction,
      })
      if (claim !== null) {
        return claim
      }
    }
  }
  await transaction
    .update(apiAiJobs)
    .set({nextAttemptAt: new Date(now.getTime() + API_AI_POLICY.retryMilliseconds)})
    .where(eq(apiAiJobs.id, job.id))
  return null
}

/** Atomically claims a job and its applicable account, request and token capacity. */
export const claimApiAiJob = (
  jobId: string,
  providers: ReadonlyArray<ApiAiProvider>,
  now: Date,
  attemptId: string,
): Promise<ApiAiClaim | null> =>
  withTransactionalDatabase((database) =>
    database.transaction((transaction) =>
      claimInTransaction({attemptId, jobId, now, providers, transaction}),
    ),
  )
