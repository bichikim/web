import {asc, eq, sql} from 'drizzle-orm'
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
  return supported.filter(
    (provider) =>
      !attempts.some(
        (attempt) =>
          attempt.providerId === provider.id && attempt.modelId === provider.models[job.kind],
      ),
  )
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
  const [provider] = orderProviders(providers, job, attempts)
  if (provider === undefined) {
    await transaction
      .update(apiAiJobs)
      .set({completedAt: now, errorMessage: 'AI providers are unavailable', status: 'failed'})
      .where(eq(apiAiJobs.id, job.id))
    return null
  }
  return claimProviderAttempt({
    attemptId,
    deadline,
    job,
    now,
    provider,
    transaction,
  })
}

/** Atomically claims one job while preserving the configured model order. */
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
