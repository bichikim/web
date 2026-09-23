import {and, eq, gt, isNull, lte, or, sql} from 'drizzle-orm'

import {
  aiCostLedger,
  aiJobArtifacts,
  type AiJobPayload,
  aiJobs,
  aiUsageBuckets,
  getDatabase,
  withTransactionalDatabase,
} from 'src/server/database'
import {getAiArtifactRetention} from 'src/server/ai/policy'

import {
  type AiJobRecord,
  type FinalizeAiJobInput,
  getPersistedAiArtifact,
  isTerminalStatus,
  mapAiJob,
  MAXIMUM_PROGRESS,
  MAXIMUM_RECOVERY_JOBS,
  replaceAiJobArtifactObjectKey,
} from './shared'
import {type AiTransaction, releaseAiJobConcurrencyInTransaction} from './concurrency'

const settleAiJobCredits = async (
  transaction: AiTransaction,
  current: AiJobRecord,
  input: FinalizeAiJobInput,
): Promise<void> => {
  if (current.estimatedCredits === null) {
    return
  }

  const settledCredits = input.settledCredits ?? current.estimatedCredits
  const reservedCredits = sql`${aiUsageBuckets.reservedCredits} - ${current.estimatedCredits}`
  const usageUpdate =
    input.status === 'succeeded'
      ? {
          consumedCredits: sql`${aiUsageBuckets.consumedCredits} + ${settledCredits}`,
          reservedCredits,
          updatedAt: new Date(),
        }
      : {reservedCredits, updatedAt: new Date()}

  await transaction
    .update(aiUsageBuckets)
    .set(usageUpdate)
    .where(
      and(
        eq(aiUsageBuckets.periodStart, current.usagePeriodStart),
        eq(aiUsageBuckets.userId, current.userId),
      ),
    )
}

const getAiCostLedgerStatus = (
  current: Pick<AiJobRecord, 'runnerJobId' | 'status' | 'submissionState'>,
  input: FinalizeAiJobInput,
): 'cancelled' | 'failed' | 'succeeded' | 'unknown' => {
  if (input.providerCostStatus !== undefined) {
    return input.providerCostStatus
  }

  if (
    input.status === 'cancelled' &&
    current.status === 'queued' &&
    (current.submissionState !== 'not_submitted' || current.runnerJobId !== null)
  ) {
    return 'unknown'
  }

  switch (input.status) {
    case 'succeeded':
      return 'succeeded'
    case 'cancelled':
      return 'cancelled'
    case 'timed_out':
      return 'unknown'
    case 'failed':
      return 'failed'
  }
}

const updateAiCostLedger = async (
  transaction: AiTransaction,
  current: Pick<AiJobRecord, 'runnerJobId' | 'status' | 'submissionState'>,
  jobId: string,
  input: FinalizeAiJobInput,
): Promise<void> => {
  await transaction
    .update(aiCostLedger)
    .set({
      actualCostMicros: input.actualCostMicros ?? null,
      billedUsage: input.billedUsage ?? null,
      rateVersion: input.rateVersion ?? null,
      status: getAiCostLedgerStatus(current, input),
      updatedAt: new Date(),
    })
    .where(eq(aiCostLedger.jobId, jobId))
}

const persistAiJobArtifact = async (
  transaction: AiTransaction,
  current: AiJobRecord,
  result: AiJobPayload | null | undefined,
): Promise<void> => {
  const artifact = getPersistedAiArtifact(result)
  if (artifact === null) {
    return
  }

  await transaction
    .insert(aiJobArtifacts)
    .values({
      contentType:
        typeof artifact.contentType === 'string'
          ? artifact.contentType
          : 'application/octet-stream',
      durationMs: typeof artifact.durationMs === 'number' ? artifact.durationMs : null,
      expiresAt: getAiArtifactRetention('unsaved-result', new Date()),
      jobId: current.id,
      objectKey: artifact.objectKey,
      retentionClass: 'unsaved_result',
      sizeBytes: typeof artifact.sizeBytes === 'number' ? artifact.sizeBytes : null,
      userId: current.userId,
    })
    .onConflictDoNothing()
}

export const finalizeAiJob = (
  jobId: string,
  input: FinalizeAiJobInput,
): Promise<AiJobRecord | null> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [current] = await transaction.select().from(aiJobs).where(eq(aiJobs.id, jobId)).limit(1)
      if (current === undefined || isTerminalStatus(current.status)) {
        return current === undefined ? null : mapAiJob(current)
      }

      const finalizationConditions = [eq(aiJobs.id, jobId), eq(aiJobs.status, current.status)]
      if (input.acceptBeforeTimeout === true) {
        finalizationConditions.push(sql`${aiJobs.timeoutAt} > now()`)
      }

      const [updated] = await transaction
        .update(aiJobs)
        .set({
          completedAt: new Date(),
          dispatchLeaseUntil: null,
          errorCode: input.errorCode ?? null,
          errorMessage: input.errorMessage ?? null,
          progress:
            input.status === 'succeeded' ? MAXIMUM_PROGRESS : (input.progress ?? current.progress),
          result: input.result ?? null,
          settledCredits:
            input.status === 'succeeded'
              ? (input.settledCredits ?? current.estimatedCredits)
              : null,
          status: input.status,
          updatedAt: new Date(),
        })
        .where(and(...finalizationConditions))
        .returning()

      if (updated === undefined) {
        const [latest] = await transaction
          .select()
          .from(aiJobs)
          .where(eq(aiJobs.id, jobId))
          .limit(1)
        return latest === undefined ? null : mapAiJob(latest)
      }

      await settleAiJobCredits(transaction, current, input)
      await releaseAiJobConcurrencyInTransaction(transaction, current.id)

      await updateAiCostLedger(transaction, mapAiJob(current), current.id, input)

      if (input.status === 'succeeded') {
        await persistAiJobArtifact(transaction, current, input.result)
      }

      return mapAiJob(updated)
    }),
  )

export const cancelAiJob = (
  jobId: string,
  options: {readonly providerCostUnknown?: boolean} = {},
): Promise<AiJobRecord | null> =>
  finalizeAiJob(jobId, {
    errorCode: 'cancelled',
    errorMessage: 'AI job cancelled by the user',
    providerCostStatus: options.providerCostUnknown ? 'unknown' : undefined,
    status: 'cancelled',
  })

export const expireAiJob = (jobId: string): Promise<AiJobRecord | null> =>
  finalizeAiJob(jobId, {
    errorCode: 'timed_out',
    errorMessage: 'AI job timed out before completion',
    status: 'timed_out',
  })

export const listExpiredAiJobs = async (
  now: Date = new Date(),
): Promise<ReadonlyArray<AiJobRecord>> => {
  const jobs = await getDatabase()
    .select()
    .from(aiJobs)
    .where(
      and(
        or(
          and(eq(aiJobs.status, 'running'), lte(aiJobs.dispatchLeaseUntil, now)),
          lte(aiJobs.timeoutAt, now),
        ),
        sql`${aiJobs.status} not in ('succeeded', 'failed', 'cancelled', 'timed_out')`,
      ),
    )
    .limit(MAXIMUM_RECOVERY_JOBS)

  return jobs.map(mapAiJob)
}

export const listDispatchableAiJobs = async (
  now: Date = new Date(),
): Promise<ReadonlyArray<AiJobRecord>> => {
  const jobs = await getDatabase()
    .select()
    .from(aiJobs)
    .where(
      and(
        eq(aiJobs.status, 'queued'),
        eq(aiJobs.submissionState, 'not_submitted'),
        or(isNull(aiJobs.dispatchLeaseUntil), lte(aiJobs.dispatchLeaseUntil, now)),
        gt(aiJobs.timeoutAt, now),
      ),
    )
    .limit(MAXIMUM_RECOVERY_JOBS)

  return jobs.map(mapAiJob)
}

export const getUsagePeriodStart = (dateValue: Date = new Date()): string => {
  const year = dateValue.getUTCFullYear()
  const month = String(dateValue.getUTCMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}
