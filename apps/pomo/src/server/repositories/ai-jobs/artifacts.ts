import {and, eq, gt, isNull, lte, or, sql} from 'drizzle-orm'

import {
  aiCostLedger,
  aiJobArtifacts,
  aiJobs,
  getDatabase,
  withTransactionalDatabase,
} from 'src/server/database'

import {
  type AiArtifactRecord,
  type AiArtifactStateExpectation,
  type AiJobRecord,
  ARCHIVE_OPERATION_STALE_MILLISECONDS,
  getAiArtifactStateConditions,
  INTERMEDIATE_RETENTION_MILLISECONDS,
  mapAiArtifact,
  MAXIMUM_RECOVERY_JOBS,
  replaceAiJobArtifactObjectKey,
} from './shared'

export const findAiJobArtifactForUser = async (
  jobId: string,
  userId: string,
): Promise<AiArtifactRecord | null> => {
  const [artifact] = await getDatabase()
    .select()
    .from(aiJobArtifacts)
    .where(
      and(
        eq(aiJobArtifacts.jobId, jobId),
        eq(aiJobArtifacts.userId, userId),
        or(isNull(aiJobArtifacts.expiresAt), gt(aiJobArtifacts.expiresAt, new Date())),
        sql`${aiJobArtifacts.lifecycle} not in ('deleted', 'deletion_pending', 'archive_cleanup_pending')`,
      ),
    )
    .limit(1)

  return artifact === undefined ? null : mapAiArtifact(artifact)
}

/** Claims an archive destination before the external copy so cleanup cannot delete it as a result. */
export const prepareAiJobArtifactArchive = async (
  artifactId: string,
  userId: string,
  archiveObjectKey: string,
): Promise<AiArtifactRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobArtifacts)
    .set({archivePendingAt: new Date(), lifecycle: 'archiving', pendingObjectKey: archiveObjectKey})
    .where(
      and(
        ...getAiArtifactStateConditions(artifactId, {
          expectedLifecycle: 'temporary',
          expectedPendingObjectKey: null,
          expectedSourceObjectKey: null,
        }),
        eq(aiJobArtifacts.userId, userId),
      ),
    )
    .returning()

  return updated === undefined ? null : mapAiArtifact(updated)
}

export const clearAiJobArtifactPendingArchive = async (
  artifactId: string,
  userId: string,
  archiveObjectKey: string,
): Promise<AiArtifactRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobArtifacts)
    .set({archivePendingAt: null, lifecycle: 'temporary', pendingObjectKey: null})
    .where(
      and(
        ...getAiArtifactStateConditions(artifactId, {
          expectedLifecycle: 'archiving',
          expectedPendingObjectKey: archiveObjectKey,
        }),
        eq(aiJobArtifacts.userId, userId),
      ),
    )
    .returning()

  return updated === undefined ? null : mapAiArtifact(updated)
}

/** Claims an abandoned archive copy before cleanup can delete it. */
export const claimAiJobArtifactArchiveCleanup = async (
  artifactId: string,
  expectation: AiArtifactStateExpectation,
): Promise<AiArtifactRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobArtifacts)
    .set({lifecycle: 'archive_cleanup_pending'})
    .where(
      and(
        ...getAiArtifactStateConditions(artifactId, expectation),
        eq(aiJobArtifacts.lifecycle, 'archiving'),
      ),
    )
    .returning()

  return updated === undefined ? null : mapAiArtifact(updated)
}

/** Restores the temporary result after an abandoned archive copy is removed. */
export const clearAiJobArtifactArchiveCleanup = async (
  artifactId: string,
  archiveObjectKey: string,
): Promise<AiArtifactRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobArtifacts)
    .set({archivePendingAt: null, lifecycle: 'temporary', pendingObjectKey: null})
    .where(
      and(
        ...getAiArtifactStateConditions(artifactId, {
          expectedLifecycle: 'archive_cleanup_pending',
          expectedPendingObjectKey: archiveObjectKey,
        }),
      ),
    )
    .returning()

  return updated === undefined ? null : mapAiArtifact(updated)
}

export const saveAiJobArtifact = async (
  artifactId: string,
  userId: string,
  objectKey: string,
  options: {readonly storageQuotaBytes?: number} = {},
): Promise<AiArtifactRecord | null> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      if (options.storageQuotaBytes !== undefined) {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtext('ai-storage'), hashtext(${userId}))`,
        )
      }

      const [current] = await transaction
        .select()
        .from(aiJobArtifacts)
        .where(
          and(
            eq(aiJobArtifacts.id, artifactId),
            eq(aiJobArtifacts.userId, userId),
            sql`${aiJobArtifacts.lifecycle} <> 'deleted'`,
          ),
        )
        .limit(1)

      if (current === undefined) {
        return null
      }
      if (current.lifecycle === 'saved') {
        return mapAiArtifact(current)
      }
      if (current.lifecycle !== 'archiving' || current.pendingObjectKey !== objectKey) {
        return null
      }

      if (options.storageQuotaBytes !== undefined) {
        if (current.sizeBytes === null) {
          return null
        }

        const [{totalBytes}] = await transaction
          .select({totalBytes: sql<number>`coalesce(sum(${aiJobArtifacts.sizeBytes}), 0)`})
          .from(aiJobArtifacts)
          .where(and(eq(aiJobArtifacts.userId, userId), eq(aiJobArtifacts.lifecycle, 'saved')))
        if (Number(totalBytes) + current.sizeBytes > options.storageQuotaBytes) {
          return null
        }
      }

      const [job] = await transaction
        .select({result: aiJobs.result})
        .from(aiJobs)
        .where(eq(aiJobs.id, current.jobId))
        .limit(1)
      if (job === undefined) {
        return null
      }

      const [updated] = await transaction
        .update(aiJobArtifacts)
        .set({
          archivePendingAt: null,
          expiresAt: null,
          lifecycle: 'saved',
          objectKey,
          pendingObjectKey: null,
          retentionClass: 'saved_result',
          savedAt: new Date(),
          sourceObjectKey: current.objectKey,
        })
        .where(
          and(
            ...getAiArtifactStateConditions(artifactId, {
              expectedLifecycle: 'archiving',
              expectedObjectKey: current.objectKey,
              expectedPendingObjectKey: objectKey,
              expectedSourceObjectKey: null,
            }),
            eq(aiJobArtifacts.userId, userId),
          ),
        )
        .returning()

      if (updated !== undefined) {
        await transaction
          .update(aiJobs)
          .set({
            result: replaceAiJobArtifactObjectKey(job?.result ?? null, objectKey),
            updatedAt: new Date(),
          })
          .where(eq(aiJobs.id, current.jobId))
      }

      return updated === undefined ? null : mapAiArtifact(updated)
    }),
  )

export const clearAiJobArtifactSourceObjectKey = async (
  artifactId: string,
  sourceObjectKey: string,
): Promise<AiArtifactRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobArtifacts)
    .set({lifecycle: 'saved', sourceObjectKey: null})
    .where(
      and(
        ...getAiArtifactStateConditions(artifactId, {
          expectedLifecycle: 'saved',
          expectedSourceObjectKey: sourceObjectKey,
        }),
      ),
    )
    .returning()

  return updated === undefined ? null : mapAiArtifact(updated)
}

export const claimAiJobArtifactDeletion = async (
  artifactId: string,
  expectation: AiArtifactStateExpectation,
): Promise<AiArtifactRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobArtifacts)
    .set({
      lastDeleteError: null,
      lifecycle: 'deletion_pending',
      pendingObjectKey: sql`coalesce(${aiJobArtifacts.pendingObjectKey}, ${aiJobArtifacts.objectKey})`,
    })
    .where(and(...getAiArtifactStateConditions(artifactId, expectation)))
    .returning()

  return updated === undefined ? null : mapAiArtifact(updated)
}

export const markAiJobArtifactDeleted = async (
  artifactId: string,
  expectation?: AiArtifactStateExpectation,
): Promise<AiArtifactRecord | null> => {
  const [updated] = await getDatabase()
    .update(aiJobArtifacts)
    .set({
      archivePendingAt: null,
      deletedAt: new Date(),
      lastDeleteError: null,
      lifecycle: 'deleted',
      pendingObjectKey: null,
      sourceObjectKey: null,
    })
    .where(and(...getAiArtifactStateConditions(artifactId, expectation)))
    .returning()

  return updated === undefined ? null : mapAiArtifact(updated)
}

export const recordAiJobArtifactDeleteFailure = async (
  artifactId: string,
  message: string,
  options: AiArtifactStateExpectation & {readonly preserveLifecycle?: boolean} = {},
): Promise<AiArtifactRecord | null> => {
  const update = {
    deleteAttempts: sql`${aiJobArtifacts.deleteAttempts} + 1`,
    lastDeleteError: message,
  }
  if (options.preserveLifecycle !== true) {
    Object.assign(update, {
      lifecycle: 'deletion_pending' as const,
      pendingObjectKey: sql`coalesce(${aiJobArtifacts.pendingObjectKey}, ${aiJobArtifacts.objectKey})`,
    })
  }

  const [updated] = await getDatabase()
    .update(aiJobArtifacts)
    .set(update)
    .where(and(...getAiArtifactStateConditions(artifactId, options)))
    .returning()

  return updated === undefined ? null : mapAiArtifact(updated)
}

export const listExpiredAiArtifacts = async (
  now: Date = new Date(),
): Promise<ReadonlyArray<AiArtifactRecord>> => {
  const staleArchiveBefore = new Date(now.getTime() - ARCHIVE_OPERATION_STALE_MILLISECONDS)
  const artifacts = await getDatabase()
    .select()
    .from(aiJobArtifacts)
    .where(
      and(
        or(
          eq(aiJobArtifacts.lifecycle, 'deletion_pending'),
          eq(aiJobArtifacts.lifecycle, 'archive_cleanup_pending'),
          lte(aiJobArtifacts.expiresAt, now),
          and(
            eq(aiJobArtifacts.lifecycle, 'saved'),
            sql`${aiJobArtifacts.sourceObjectKey} is not null`,
          ),
          and(
            eq(aiJobArtifacts.lifecycle, 'archiving'),
            lte(aiJobArtifacts.archivePendingAt, staleArchiveBefore),
          ),
        ),
        sql`${aiJobArtifacts.lifecycle} <> 'deleted'`,
      ),
    )
    .limit(MAXIMUM_RECOVERY_JOBS)

  return artifacts.map(mapAiArtifact)
}

export const listAiJobsWithExpiredIntermediateArtifacts = async (
  now: Date = new Date(),
): Promise<ReadonlyArray<Pick<AiJobRecord, 'id' | 'status'>>> => {
  const completedBefore = new Date(now.getTime() - INTERMEDIATE_RETENTION_MILLISECONDS)
  const jobs = await getDatabase()
    .select({id: aiJobs.id, status: aiJobs.status})
    .from(aiJobs)
    .where(
      and(
        lte(aiJobs.completedAt, completedBefore),
        isNull(aiJobs.intermediateCleanupAt),
        sql`${aiJobs.status} in ('succeeded', 'failed', 'cancelled', 'timed_out')`,
      ),
    )
    .limit(MAXIMUM_RECOVERY_JOBS)

  return jobs
}

export const markAiJobIntermediateCleanupCompleted = async (
  jobId: string,
  now: Date = new Date(),
): Promise<boolean> => {
  const [updated] = await getDatabase()
    .update(aiJobs)
    .set({intermediateCleanupAt: now, updatedAt: now})
    .where(and(eq(aiJobs.id, jobId), isNull(aiJobs.intermediateCleanupAt)))
    .returning({id: aiJobs.id})

  return updated !== undefined
}

/** Removes expired operational cost rows without touching user results or legal billing records. */
export const purgeExpiredAiCostLedger = async (now: Date = new Date()): Promise<number> => {
  const deleted = await getDatabase()
    .delete(aiCostLedger)
    .where(lte(aiCostLedger.retentionUntil, now))
    .returning({id: aiCostLedger.id})

  return deleted.length
}
