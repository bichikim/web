import {API_AI_POLICY} from 'src/server/api-ai/policy'
import {and, asc, eq, gt, inArray, isNull, lt, lte, or, sql} from 'drizzle-orm'
import {apiAiAttempts, apiAiJobs, getDatabase, withTransactionalDatabase} from 'src/server/database'
import {getApiAiResponseTransition} from 'src/server/api-ai/response-transition'
import {isApiAiAttemptActive, isApiAiJobActive} from 'src/server/api-ai/status'
import type {ApiAiAttempt, ApiAiResponse, ApiAiSubmissionError} from 'src/server/api-ai/types'
import type {ApiAiTransaction} from './types'
import {apiAiAttemptSelection} from './selections'

export const findApiAiAttempt = async (attemptId: string): Promise<ApiAiAttempt | null> => {
  const [attempt] = await getDatabase()
    .select(apiAiAttemptSelection)
    .from(apiAiAttempts)
    .where(eq(apiAiAttempts.id, attemptId))
    .limit(1)
  return attempt ?? null
}

export const findApiAiResponseAttempt = async (
  providerId: string,
  responseId: string,
): Promise<ApiAiAttempt | null> => {
  const [attempt] = await getDatabase()
    .select(apiAiAttemptSelection)
    .from(apiAiAttempts)
    .where(and(eq(apiAiAttempts.providerId, providerId), eq(apiAiAttempts.responseId, responseId)))
    .limit(1)
  return attempt ?? null
}

export const listActiveApiAiAttempts = (now: Date): Promise<ReadonlyArray<ApiAiAttempt>> =>
  getDatabase()
    .select(apiAiAttemptSelection)
    .from(apiAiAttempts)
    .where(
      and(
        inArray(apiAiAttempts.state, ['submitting', 'running', 'unknown']),
        or(isNull(apiAiAttempts.retryAt), lte(apiAiAttempts.retryAt, now)),
        lt(
          apiAiAttempts.createdAt,
          new Date(now.getTime() - API_AI_POLICY.recoveryDelayMilliseconds),
        ),
        sql`${apiAiAttempts.jobId} in (select id from api_ai_jobs
        where status in ('submitting', 'running', 'recovery_pending') or ${apiAiAttempts.responseId} is not null)`,
      ),
    )
    .orderBy(sql`${apiAiAttempts.retryAt} asc nulls first`, asc(apiAiAttempts.createdAt))
    .limit(API_AI_POLICY.maximumBatch)

/** Claims one due recovery check so repeated failures do not monopolize a recovery batch. */
export const claimApiAiAttemptRecovery = async (attemptId: string, now: Date): Promise<boolean> => {
  const [claimed] = await getDatabase()
    .update(apiAiAttempts)
    .set({retryAt: new Date(now.getTime() + API_AI_POLICY.recoveryDelayMilliseconds)})
    .where(
      and(
        eq(apiAiAttempts.id, attemptId),
        inArray(apiAiAttempts.state, ['submitting', 'running', 'unknown']),
        or(isNull(apiAiAttempts.retryAt), lte(apiAiAttempts.retryAt, now)),
      ),
    )
    .returning({id: apiAiAttempts.id})
  return claimed !== undefined
}

const persistSubmissionError = async (
  transaction: ApiAiTransaction,
  attemptId: string,
  error: ApiAiSubmissionError,
  now: Date,
): Promise<void> => {
  await transaction.execute(sql`select pg_advisory_xact_lock(hashtext('api-ai-dispatch'), 0)`)
  const [attempt] = await transaction
    .select()
    .from(apiAiAttempts)
    .where(eq(apiAiAttempts.id, attemptId))
    .for('update')
    .limit(1)
  if (attempt === undefined || attempt.state !== 'submitting') {
    return
  }
  const [job] = await transaction
    .select()
    .from(apiAiJobs)
    .where(eq(apiAiJobs.id, attempt.jobId))
    .for('update')
    .limit(1)
  const rejected = error.acceptance === 'rejected'
  const cancelled = rejected && job !== undefined && job.cancelRequestedAt !== null
  const retry = error.fallback && !cancelled
  await transaction
    .update(apiAiAttempts)
    .set({
      errorMessage: error.message,
      retryAt: retry && !error.disabled ? new Date(error.retryAt) : null,
      state: rejected ? 'rejected' : 'unknown',
    })
    .where(eq(apiAiAttempts.id, attempt.id))
  if (rejected) {
    await transaction
      .update(apiAiJobs)
      .set({nextAttemptAt: now})
      .where(and(eq(apiAiJobs.status, 'queued'), gt(apiAiJobs.nextAttemptAt, now)))
  }
  await transaction
    .update(apiAiJobs)
    .set({
      completedAt: rejected && !retry ? now : null,
      errorMessage: error.message,
      nextAttemptAt: now,
      status: rejected
        ? cancelled
          ? 'cancelled'
          : retry
            ? 'queued'
            : 'failed'
        : 'recovery_pending',
    })
    .where(
      and(
        eq(apiAiJobs.id, attempt.jobId),
        eq(apiAiJobs.activeAttemptId, attempt.id),
        eq(apiAiJobs.status, 'submitting'),
      ),
    )
}

/** Persists rejection or ambiguity only while this attempt still owns dispatch. */
export const recordApiAiSubmissionError = (
  attemptId: string,
  error: ApiAiSubmissionError,
  now: Date,
): Promise<void> =>
  withTransactionalDatabase((database) =>
    database.transaction((transaction) =>
      persistSubmissionError(transaction, attemptId, error, now),
    ),
  )

const persistResponse = async (
  transaction: ApiAiTransaction,
  attemptId: string,
  response: ApiAiResponse,
  now: Date,
): Promise<void> => {
  await transaction.execute(sql`select pg_advisory_xact_lock(hashtext('api-ai-dispatch'), 0)`)
  const [attempt] = await transaction
    .select()
    .from(apiAiAttempts)
    .where(eq(apiAiAttempts.id, attemptId))
    .for('update')
    .limit(1)
  if (
    attempt === undefined ||
    !isApiAiAttemptActive(attempt.state) ||
    (attempt.responseId !== null && attempt.responseId !== response.responseId)
  ) {
    return
  }
  const [job] = await transaction
    .select()
    .from(apiAiJobs)
    .where(eq(apiAiJobs.id, attempt.jobId))
    .for('update')
    .limit(1)
  const transition = getApiAiResponseTransition(
    response,
    job !== undefined && job.cancelRequestedAt !== null,
  )
  await transaction
    .update(apiAiAttempts)
    .set({
      billedTokens: response.tokenCount,
      responseId: response.responseId,
      retryAt:
        transition.attemptState === 'running'
          ? new Date(now.getTime() + API_AI_POLICY.recoveryDelayMilliseconds)
          : transition.retry
            ? new Date(now.getTime() + API_AI_POLICY.retryMilliseconds)
            : null,
      state: transition.attemptState,
    })
    .where(eq(apiAiAttempts.id, attempt.id))
  if (transition.attemptState !== 'running') {
    await transaction
      .update(apiAiJobs)
      .set({nextAttemptAt: now})
      .where(and(eq(apiAiJobs.status, 'queued'), gt(apiAiJobs.nextAttemptAt, now)))
  }
  if (job === undefined || job.activeAttemptId !== attempt.id || !isApiAiJobActive(job.status)) {
    return
  }
  await transaction
    .update(apiAiJobs)
    .set({
      completedAt: transition.terminal ? now : null,
      errorMessage:
        transition.status === 'succeeded' || transition.status === 'running'
          ? null
          : (response.failureCode ?? `AI provider ended with ${response.status}`),
      nextAttemptAt: now,
      result: transition.terminal ? response : null,
      status: transition.status,
    })
    .where(eq(apiAiJobs.id, job.id))
}

/** Records provider state without allowing stale attempts to settle a different attempt. */
export const recordApiAiResponse = (
  attemptId: string,
  response: ApiAiResponse,
  now: Date,
): Promise<void> =>
  withTransactionalDatabase((database) =>
    database.transaction((transaction) => persistResponse(transaction, attemptId, response, now)),
  )
