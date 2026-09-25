import {and, count, eq, gt, isNull, lte, or, sql} from 'drizzle-orm'

import {
  aiCostLedger,
  aiJobs,
  aiUsageBuckets,
  commerceEntitlementGrants,
  commerceProducts,
  getDatabase,
  withTransactionalDatabase,
} from 'src/server/database'
import {getAiArtifactRetention, getSubscriptionUsagePeriod} from 'src/server/ai/policy'

import {
  type AiJobRecord,
  AiLimitExceededError,
  type CreateAiJobInput,
  type CreateAiJobResult,
  mapAiJob,
  MAXIMUM_RECOVERY_JOBS,
  readJobById,
} from './shared'

export const createAiJob = async (
  input: CreateAiJobInput,
  options: {
    readonly maxQueueLength: number
    readonly monthlyCreditCap?: number
    readonly productCode: string
    readonly now?: Date
  },
): Promise<CreateAiJobResult> => {
  const now = options.now ?? new Date()

  try {
    return await withTransactionalDatabase((database) =>
      database.transaction(async (transaction) => {
        // Serialize one user's idempotency and queue checks across concurrent submissions.
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext('ai-submit'), hashtext(${input.userId}))`,
        )

        const [existing] = await transaction
          .select()
          .from(aiJobs)
          .where(
            and(eq(aiJobs.userId, input.userId), eq(aiJobs.idempotencyKey, input.idempotencyKey)),
          )
          .limit(1)

        if (existing !== undefined) {
          return existing.requestHash === input.requestHash
            ? {job: mapAiJob(existing), kind: 'existing' as const}
            : {job: mapAiJob(existing), kind: 'idempotency-conflict' as const}
        }

        const [grant] = await transaction
          .select({
            endsAt: commerceEntitlementGrants.endsAt,
            id: commerceEntitlementGrants.id,
            startsAt: commerceEntitlementGrants.startsAt,
          })
          .from(commerceEntitlementGrants)
          .innerJoin(commerceProducts, eq(commerceProducts.id, commerceEntitlementGrants.productId))
          .where(
            and(
              eq(commerceEntitlementGrants.userId, input.userId),
              eq(commerceProducts.code, options.productCode),
              eq(commerceProducts.status, 'active'),
              isNull(commerceEntitlementGrants.revokedAt),
              lte(commerceEntitlementGrants.startsAt, now),
              or(
                isNull(commerceEntitlementGrants.endsAt),
                gt(commerceEntitlementGrants.endsAt, now),
              ),
            ),
          )
          .limit(1)

        if (grant === undefined) {
          return {kind: 'not-entitled' as const}
        }

        const [{queuedCount}] = await transaction
          .select({queuedCount: count(aiJobs.id)})
          .from(aiJobs)
          .where(
            and(
              eq(aiJobs.userId, input.userId),
              or(eq(aiJobs.status, 'queued'), eq(aiJobs.status, 'recovery_pending')),
            ),
          )

        if (queuedCount >= options.maxQueueLength) {
          throw new AiLimitExceededError('queue-exceeded', 'AI queue limit exceeded')
        }

        const usagePeriod = getSubscriptionUsagePeriod(grant.startsAt, now, grant.endsAt)

        const [inserted] = await transaction
          .insert(aiJobs)
          .values({
            capability: input.capability,
            estimatedCredits: input.estimatedCredits,
            idempotencyKey: input.idempotencyKey,
            modelId: input.modelId,
            quotaUnits: input.quotaUnits,
            request: input.request,
            requestHash: input.requestHash,
            timeoutAt: input.timeoutAt,
            usagePeriodEnd: usagePeriod.end,
            usagePeriodStart: usagePeriod.start,
            userId: input.userId,
          })
          .onConflictDoNothing()
          .returning()

        if (inserted === undefined) {
          const [conflictingRow] = await transaction
            .select()
            .from(aiJobs)
            .where(
              and(eq(aiJobs.userId, input.userId), eq(aiJobs.idempotencyKey, input.idempotencyKey)),
            )
            .limit(1)
          if (conflictingRow === undefined) {
            throw new Error('AI job disappeared after an idempotency conflict')
          }

          const conflicting = mapAiJob(conflictingRow)
          return conflicting.requestHash === input.requestHash
            ? {job: conflicting, kind: 'existing' as const}
            : {job: conflicting, kind: 'idempotency-conflict' as const}
        }

        await transaction.insert(aiCostLedger).values({
          jobId: inserted.id,
          modelId: inserted.modelId,
          provider: inserted.modelId === 'gpt-5.6-luna' ? 'openai' : 'local-runner',
          retentionUntil: getAiArtifactRetention('operational-record', now) ?? now,
        })

        if (input.estimatedCredits !== null && options.monthlyCreditCap !== undefined) {
          await transaction
            .insert(aiUsageBuckets)
            .values({periodStart: usagePeriod.start, userId: input.userId})
            .onConflictDoNothing()

          const [reserved] = await transaction
            .update(aiUsageBuckets)
            .set({
              reservedCredits: sql`${aiUsageBuckets.reservedCredits} + ${input.estimatedCredits}`,
              updatedAt: now,
            })
            .where(
              and(
                eq(aiUsageBuckets.periodStart, usagePeriod.start),
                eq(aiUsageBuckets.userId, input.userId),
                sql`${aiUsageBuckets.consumedCredits} + ${aiUsageBuckets.reservedCredits} + ${input.estimatedCredits}
                  <= ${options.monthlyCreditCap}`,
              ),
            )
            .returning({userId: aiUsageBuckets.userId})

          if (reserved === undefined) {
            throw new AiLimitExceededError('quota-exceeded', 'AI credit quota exceeded')
          }
        }

        return {job: mapAiJob(inserted), kind: 'created' as const}
      }),
    )
  } catch (error: unknown) {
    if (error instanceof AiLimitExceededError) {
      return {kind: error.kind}
    }

    throw error
  }
}

export const findAiJobForUser = async (
  jobId: string,
  userId: string,
): Promise<AiJobRecord | null> => {
  const [job] = await getDatabase()
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.userId, userId)))
    .limit(1)
  return job === undefined ? null : mapAiJob(job)
}

export const hasActiveAiEntitlement = async (
  userId: string,
  productCode: string,
  now: Date = new Date(),
): Promise<boolean> => {
  const [grant] = await getDatabase()
    .select({id: commerceEntitlementGrants.id})
    .from(commerceEntitlementGrants)
    .innerJoin(commerceProducts, eq(commerceProducts.id, commerceEntitlementGrants.productId))
    .where(
      and(
        eq(commerceEntitlementGrants.userId, userId),
        eq(commerceProducts.code, productCode),
        eq(commerceProducts.status, 'active'),
        isNull(commerceEntitlementGrants.revokedAt),
        lte(commerceEntitlementGrants.startsAt, now),
        or(isNull(commerceEntitlementGrants.endsAt), gt(commerceEntitlementGrants.endsAt, now)),
      ),
    )
    .limit(1)

  return grant !== undefined
}

export const findAiJob = (jobId: string): Promise<AiJobRecord | null> =>
  readJobById(getDatabase(), jobId)

/** Claims a queued job for one dispatcher until its provider timeout. */
export const claimAiJobForDispatch = async (
  jobId: string,
  now: Date,
  leaseUntil: Date,
): Promise<AiJobRecord | null> => {
  const [claimed] = await getDatabase()
    .update(aiJobs)
    .set({dispatchLeaseUntil: leaseUntil, submissionState: 'unknown', updatedAt: now})
    .where(
      and(
        eq(aiJobs.id, jobId),
        eq(aiJobs.status, 'queued'),
        eq(aiJobs.submissionState, 'not_submitted'),
        or(isNull(aiJobs.dispatchLeaseUntil), lte(aiJobs.dispatchLeaseUntil, now)),
        gt(aiJobs.timeoutAt, now),
      ),
    )
    .returning()

  return claimed === undefined ? null : mapAiJob(claimed)
}

/** Attaches the external runner ID only while the durable dispatch claim is held. */
export const markAiJobRunning = async (
  jobId: string,
  runnerJobId: string,
  leaseUntil: Date,
): Promise<AiJobRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobs)
    .set({
      attemptCount: sql`${aiJobs.attemptCount} + 1`,
      dispatchLeaseUntil: leaseUntil,
      lastRunnerError: null,
      lastSubmissionError: null,
      providerAcceptedAt: new Date(),
      recoveryDeadlineAt: null,
      runnerJobId,
      startedAt: sql`coalesce(${aiJobs.startedAt}, now())`,
      status: 'running',
      submissionState: 'accepted',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(aiJobs.id, jobId),
        eq(aiJobs.status, 'queued'),
        eq(aiJobs.dispatchLeaseUntil, leaseUntil),
      ),
    )
    .returning()

  return updated === undefined ? null : mapAiJob(updated)
}

/** Persists provider acceptance without allowing an automatic duplicate submission. */
export const markAiJobRecoveryPending = async (
  jobId: string,
  input: {
    readonly dispatchLeaseUntil: Date
    readonly errorMessage: string
    readonly recoveryDeadlineAt: Date
    readonly runnerJobId?: string
  },
): Promise<AiJobRecord | null> => {
  const canUpdateRecovery =
    input.runnerJobId === undefined
      ? and(
          eq(aiJobs.status, 'queued'),
          or(
            eq(aiJobs.dispatchLeaseUntil, input.dispatchLeaseUntil),
            eq(aiJobs.submissionState, 'unknown'),
          ),
        )
      : or(
          and(
            eq(aiJobs.status, 'queued'),
            or(
              eq(aiJobs.dispatchLeaseUntil, input.dispatchLeaseUntil),
              eq(aiJobs.submissionState, 'unknown'),
            ),
          ),
          and(eq(aiJobs.status, 'recovery_pending'), isNull(aiJobs.runnerJobId)),
        )

  const [updated] = await getDatabase()
    .update(aiJobs)
    .set({
      dispatchLeaseUntil: null,
      lastSubmissionError: input.errorMessage,
      providerAcceptedAt: input.runnerJobId === undefined ? null : new Date(),
      recoveryAttempts: sql`${aiJobs.recoveryAttempts} + 1`,
      recoveryDeadlineAt: input.recoveryDeadlineAt,
      runnerJobId: input.runnerJobId,
      status: 'recovery_pending',
      submissionState: input.runnerJobId === undefined ? 'unknown' : 'accepted',
      updatedAt: new Date(),
    })
    .where(and(eq(aiJobs.id, jobId), canUpdateRecovery))
    .returning()

  return updated === undefined ? null : mapAiJob(updated)
}

/** Requeues only a local-runner recovery record so the same Pomo job ID is resubmitted idempotently. */
export const requeueAiJobForRunnerRecovery = async (jobId: string): Promise<AiJobRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobs)
    .set({
      dispatchLeaseUntil: null,
      lastSubmissionError: null,
      recoveryDeadlineAt: null,
      status: 'queued',
      submissionState: 'not_submitted',
      updatedAt: new Date(),
    })
    .where(
      and(eq(aiJobs.id, jobId), eq(aiJobs.status, 'recovery_pending'), isNull(aiJobs.runnerJobId)),
    )
    .returning()

  return updated === undefined ? null : mapAiJob(updated)
}

/** Leaves a job queued when the external runner is temporarily unavailable. */
export const recordAiJobDispatchError = async (
  jobId: string,
  message: string,
): Promise<AiJobRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobs)
    .set({
      dispatchLeaseUntil: null,
      lastRunnerError: message,
      recoveryDeadlineAt: null,
      submissionState: 'not_submitted',
      updatedAt: new Date(),
    })
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.status, 'queued')))
    .returning()

  return updated === undefined ? null : mapAiJob(updated)
}

export const listRunningAiJobs = async (
  now: Date = new Date(),
): Promise<ReadonlyArray<AiJobRecord>> => {
  const jobs = await getDatabase()
    .select()
    .from(aiJobs)
    .where(and(eq(aiJobs.status, 'running'), gt(aiJobs.timeoutAt, now)))
    .limit(MAXIMUM_RECOVERY_JOBS)

  return jobs.map(mapAiJob)
}

export const listRecoveryPendingAiJobs = async (
  now: Date = new Date(),
): Promise<ReadonlyArray<AiJobRecord>> => {
  const jobs = await getDatabase()
    .select()
    .from(aiJobs)
    .where(
      and(
        or(
          eq(aiJobs.status, 'recovery_pending'),
          and(eq(aiJobs.status, 'queued'), eq(aiJobs.submissionState, 'unknown')),
        ),
        or(isNull(aiJobs.recoveryDeadlineAt), gt(aiJobs.recoveryDeadlineAt, now)),
      ),
    )
    .limit(MAXIMUM_RECOVERY_JOBS)

  return jobs.map(mapAiJob)
}

export const updateAiJobProgress = async (
  jobId: string,
  progress: number,
  leaseUntil: Date,
): Promise<AiJobRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobs)
    .set({dispatchLeaseUntil: leaseUntil, progress, updatedAt: new Date()})
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.status, 'running')))
    .returning()

  return updated === undefined ? null : mapAiJob(updated)
}
