import {API_AI_POLICY} from 'src/server/api-ai/policy'
import {and, asc, count, eq, inArray, isNull, lte, sql} from 'drizzle-orm'
import {apiAiJobs, getDatabase, withTransactionalDatabase} from 'src/server/database'
import type {
  ApiAiJob,
  ApiAiJobInput,
  ApiAiJobReference,
  CreateApiAiJobResult,
} from 'src/server/api-ai/types'
import type {ApiAiTransaction} from './types'
import {apiAiJobSelection} from './selections'

/** Persists one idempotent request subject to shared and per-owner waiting limits. */
export const createApiAiJobInTransaction = async (
  transaction: ApiAiTransaction,
  input: ApiAiJobInput,
  queueLimit: number,
  now: Date,
): Promise<CreateApiAiJobResult> => {
  await transaction.execute(sql`select pg_advisory_xact_lock(hashtext('api-ai-enqueue'), 0)`)
  const [existing] = await transaction
    .select({...apiAiJobSelection, requestHash: apiAiJobs.requestHash})
    .from(apiAiJobs)
    .where(eq(apiAiJobs.id, input.id))
    .limit(1)
  if (existing !== undefined) {
    const {requestHash, ...job} = existing
    return existing.ownerId === input.ownerId && requestHash === input.requestHash
      ? {job, kind: 'existing'}
      : {kind: 'conflict'}
  }
  const [queued] = await transaction
    .select({total: count()})
    .from(apiAiJobs)
    .where(inArray(apiAiJobs.status, ['queued', 'submitting', 'recovery_pending']))
  if (queued.total >= queueLimit) {
    return {kind: 'full'}
  }
  if (input.ownerId !== null) {
    const [owned] = await transaction
      .select({total: count()})
      .from(apiAiJobs)
      .where(
        and(
          eq(apiAiJobs.ownerId, input.ownerId),
          inArray(apiAiJobs.status, ['queued', 'submitting', 'recovery_pending']),
        ),
      )
    if (owned.total >= API_AI_POLICY.maximumQueuedPerUser) {
      return {kind: 'full'}
    }
  }
  const [job] = await transaction
    .insert(apiAiJobs)
    .values({...input, createdAt: now, nextAttemptAt: now})
    .returning(apiAiJobSelection)
  return {job, kind: 'created'}
}

export const createApiAiJob = (
  input: ApiAiJobInput,
  queueLimit: number,
  now: Date,
): Promise<CreateApiAiJobResult> =>
  withTransactionalDatabase((database) =>
    database.transaction((transaction) =>
      createApiAiJobInTransaction(transaction, input, queueLimit, now),
    ),
  )

export const findApiAiJob = async (jobId: string): Promise<ApiAiJob | null> => {
  const [job] = await getDatabase()
    .select(apiAiJobSelection)
    .from(apiAiJobs)
    .where(eq(apiAiJobs.id, jobId))
    .limit(1)
  return job ?? null
}

export const listQueuedApiAiJobs = (now: Date): Promise<ReadonlyArray<ApiAiJobReference>> =>
  getDatabase()
    .select({id: apiAiJobs.id})
    .from(apiAiJobs)
    .where(and(eq(apiAiJobs.status, 'queued'), lte(apiAiJobs.nextAttemptAt, now)))
    .orderBy(asc(apiAiJobs.nextAttemptAt), asc(apiAiJobs.createdAt), asc(apiAiJobs.id))
    .limit(API_AI_POLICY.maximumBatch)

export const listUndeliveredApiAiJobs = (now: Date): Promise<ReadonlyArray<ApiAiJob>> =>
  getDatabase()
    .select(apiAiJobSelection)
    .from(apiAiJobs)
    .where(
      and(
        inArray(apiAiJobs.status, ['succeeded', 'failed', 'cancelled']),
        isNull(apiAiJobs.deliveredAt),
        lte(apiAiJobs.nextAttemptAt, now),
      ),
    )
    .orderBy(asc(apiAiJobs.nextAttemptAt), asc(apiAiJobs.completedAt), asc(apiAiJobs.id))
    .limit(API_AI_POLICY.maximumBatch)

export const markApiAiJobDelivered = async (jobId: string, now: Date): Promise<void> => {
  await getDatabase().update(apiAiJobs).set({deliveredAt: now}).where(eq(apiAiJobs.id, jobId))
}

/** Cancels unsubmitted work; active submissions retain their slot until provider termination. */
export const cancelQueuedApiAiJob = async (
  jobId: string,
  ownerId: string,
  now: Date,
): Promise<ApiAiJob | null> => {
  const [job] = await getDatabase()
    .update(apiAiJobs)
    .set({completedAt: now, nextAttemptAt: now, status: 'cancelled'})
    .where(
      and(eq(apiAiJobs.id, jobId), eq(apiAiJobs.ownerId, ownerId), eq(apiAiJobs.status, 'queued')),
    )
    .returning(apiAiJobSelection)
  return job ?? null
}

/** Terminates an unobservable submission without releasing its possibly active provider slot. */
export const failUnknownApiAiJob = async (jobId: string, now: Date): Promise<void> => {
  await getDatabase()
    .update(apiAiJobs)
    .set({
      completedAt: now,
      errorMessage: 'AI submission could not be recovered',
      nextAttemptAt: now,
      status: 'failed',
    })
    .where(
      and(
        eq(apiAiJobs.id, jobId),
        inArray(apiAiJobs.status, ['submitting', 'running', 'recovery_pending']),
      ),
    )
}
