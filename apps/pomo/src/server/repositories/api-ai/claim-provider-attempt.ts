import {and, count, eq, gt, inArray} from 'drizzle-orm'
import {apiAiAttempts, apiAiJobs, apiAiPools} from 'src/server/database'
import {API_AI_POLICY} from 'src/server/api-ai/policy'
import type {ApiAiClaim, ApiAiProvider} from 'src/server/api-ai/types'
import type {ApiAiTransaction, StoredApiAiAttempt, StoredApiAiJob} from './types'
import {apiAiAttemptSelection, apiAiJobSelection} from './selections'

interface ProviderClaimInput {
  readonly attemptId: string
  readonly attempts: ReadonlyArray<StoredApiAiAttempt>
  readonly deadline: Date
  readonly job: StoredApiAiJob
  readonly now: Date
  readonly provider: ApiAiProvider
  readonly transaction: ApiAiTransaction
}

const getTokenReservation = (body: Readonly<Record<string, unknown>>): number => {
  const maximumTokens = body.max_output_tokens
  if (
    typeof maximumTokens !== 'number' ||
    !Number.isSafeInteger(maximumTokens) ||
    maximumTokens <= 0
  ) {
    throw new TypeError('Queued AI requests require a bounded output token count')
  }
  return new TextEncoder().encode(JSON.stringify(body)).length + maximumTokens
}

/** Acquires a provider slot only when its shared pool and rolling budgets permit execution. */
export const claimProviderAttempt = async (
  input: ProviderClaimInput,
): Promise<ApiAiClaim | null> => {
  const {attemptId, attempts, deadline, job, now, provider, transaction} = input
  const previous = attempts.filter((attempt) => attempt.providerId === provider.id).at(-1)
  if (previous !== undefined && (previous.retryAt === null || previous.retryAt > now)) {
    return null
  }
  await transaction.insert(apiAiPools).values({id: provider.poolId}).onConflictDoNothing()
  const [pool] = await transaction
    .select()
    .from(apiAiPools)
    .where(eq(apiAiPools.id, provider.poolId))
  if (pool.disabled !== null || (pool.blockedUntil !== null && pool.blockedUntil > now)) {
    return null
  }
  const [active] = await transaction
    .select({total: count()})
    .from(apiAiAttempts)
    .where(
      and(
        eq(apiAiAttempts.poolId, provider.poolId),
        inArray(apiAiAttempts.state, ['submitting', 'running', 'unknown']),
      ),
    )
  const recent = await transaction
    .select()
    .from(apiAiAttempts)
    .where(
      and(
        eq(apiAiAttempts.poolId, provider.poolId),
        gt(
          apiAiAttempts.createdAt,
          new Date(now.getTime() - API_AI_POLICY.recoveryDelayMilliseconds),
        ),
      ),
    )
  const tokens = getTokenReservation(job.body)
  const budgetExceeded =
    (provider.requestsPerMinute !== undefined && recent.length >= provider.requestsPerMinute) ||
    (provider.tokensPerMinute !== undefined &&
      recent.reduce((total, attempt) => total + attempt.tokenReservation, tokens) >
        provider.tokensPerMinute)
  if (active.total >= provider.concurrency || budgetExceeded) {
    return null
  }
  const [attempt] = await transaction
    .insert(apiAiAttempts)
    .values({
      createdAt: now,
      deadlineAt: deadline,
      id: attemptId,
      jobId: job.id,
      modelId: provider.models[job.kind] ?? '',
      poolId: provider.poolId,
      providerId: provider.id,
      state: 'submitting',
      tokenReservation: tokens,
    })
    .returning(apiAiAttemptSelection)
  const [claimed] = await transaction
    .update(apiAiJobs)
    .set({activeAttemptId: attempt.id, executionExpiresAt: deadline, status: 'submitting'})
    .where(eq(apiAiJobs.id, job.id))
    .returning(apiAiJobSelection)
  return {attempt, job: claimed, provider}
}
