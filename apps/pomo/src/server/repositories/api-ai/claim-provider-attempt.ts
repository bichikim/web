import {eq} from 'drizzle-orm'
import {apiAiAttempts, apiAiJobs, apiAiPools} from 'src/server/database'
import type {ApiAiClaim, ApiAiProvider} from 'src/server/api-ai/types'
import type {ApiAiTransaction, StoredApiAiJob} from './types'
import {apiAiAttemptSelection, apiAiJobSelection} from './selections'

interface ProviderClaimInput {
  readonly attemptId: string
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

/** Creates one execution attempt for the selected model. */
export const claimProviderAttempt = async (input: ProviderClaimInput): Promise<ApiAiClaim> => {
  const {attemptId, deadline, job, now, provider, transaction} = input
  await transaction.insert(apiAiPools).values({id: provider.poolId}).onConflictDoNothing()
  const tokens = getTokenReservation(job.body)
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
