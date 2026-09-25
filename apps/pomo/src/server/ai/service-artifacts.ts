import type * as AiJobRepository from 'src/server/repositories/ai-jobs'
import type {AiArtifactRecord} from 'src/server/repositories/ai-jobs'

import {
  createAiArtifactIntermediateObjectKeyPrefix,
  createAiArtifactObjectKey,
  getAiArtifactFilename,
} from './artifacts'
import {MAXIMUM_ARTIFACT_STATE_RETRIES, MAXIMUM_RECOVERY_CONCURRENCY} from './service-shared'

export interface AiArtifactServiceRepository {
  readonly claimAiJobArtifactArchiveCleanup: typeof AiJobRepository.claimAiJobArtifactArchiveCleanup
  readonly claimAiJobArtifactDeletion: typeof AiJobRepository.claimAiJobArtifactDeletion
  readonly clearAiJobArtifactArchiveCleanup: typeof AiJobRepository.clearAiJobArtifactArchiveCleanup
  readonly clearAiJobArtifactPendingArchive: typeof AiJobRepository.clearAiJobArtifactPendingArchive
  readonly clearAiJobArtifactSourceObjectKey: typeof AiJobRepository.clearAiJobArtifactSourceObjectKey
  readonly findAiJobArtifactForUser: typeof AiJobRepository.findAiJobArtifactForUser
  readonly listAiJobsWithExpiredIntermediateArtifacts: typeof AiJobRepository.listAiJobsWithExpiredIntermediateArtifacts
  readonly listExpiredAiArtifacts: typeof AiJobRepository.listExpiredAiArtifacts
  readonly markAiJobArtifactDeleted: typeof AiJobRepository.markAiJobArtifactDeleted
  readonly markAiJobIntermediateCleanupCompleted: typeof AiJobRepository.markAiJobIntermediateCleanupCompleted
  readonly prepareAiJobArtifactArchive: typeof AiJobRepository.prepareAiJobArtifactArchive
  readonly purgeExpiredAiCostLedger: typeof AiJobRepository.purgeExpiredAiCostLedger
  readonly recordAiJobArtifactDeleteFailure: typeof AiJobRepository.recordAiJobArtifactDeleteFailure
  readonly saveAiJobArtifact: typeof AiJobRepository.saveAiJobArtifact
}

export interface AiArtifactServiceStorage {
  readonly copyAiArtifactObject: (
    sourceObjectKey: string,
    destinationObjectKey: string,
  ) => Promise<void>
  readonly deleteAiArtifactObject: (objectKey: string) => Promise<void>
  readonly listAiArtifactIntermediateObjectKeys: (jobId: string) => Promise<ReadonlyArray<string>>
  readonly listAiArtifactTemporaryObjectKeys: (jobId: string) => Promise<ReadonlyArray<string>>
}

export interface AiArtifactServiceDependencies {
  readonly clock: () => Date
  readonly repository: AiArtifactServiceRepository
  readonly storage: AiArtifactServiceStorage
  readonly storageQuotaBytes?: number
}

const runArtifactCleanupTasks = async <Job, Result>(
  jobs: ReadonlyArray<Job>,
  operation: (job: Job) => Promise<Result>,
): Promise<Array<Awaited<Result>>> => {
  const results: Array<Awaited<Result>> = []

  for (let offset = 0; offset < jobs.length; offset += MAXIMUM_RECOVERY_CONCURRENCY) {
    const batch = jobs.slice(offset, offset + MAXIMUM_RECOVERY_CONCURRENCY)
    // oxlint-disable-next-line no-await-in-loop -- Bound storage calls without an unbounded burst.
    const batchResults = await Promise.all(
      batch.map(async (job) => {
        try {
          return await operation(job)
        } catch (error: unknown) {
          console.error('Failed to process an AI artifact cleanup item', error)
          return null
        }
      }),
    )
    results.push(...batchResults.filter((result): result is Awaited<Result> => result !== null))
  }

  return results
}

const createAiArtifactPersistenceService = (
  dependencies: Pick<AiArtifactServiceDependencies, 'repository' | 'storage' | 'storageQuotaBytes'>,
) => {
  const {repository, storage, storageQuotaBytes} = dependencies

  const saveAiJobArtifactForUser = async (
    jobId: string,
    userId: string,
  ): Promise<AiArtifactRecord | null> => {
    const artifact = await repository.findAiJobArtifactForUser(jobId, userId)
    if (artifact === null || artifact.lifecycle === 'saved') {
      return artifact
    }

    const archiveObjectKey = createAiArtifactObjectKey(
      jobId,
      'archive',
      getAiArtifactFilename(artifact.objectKey),
    )
    const pending = await repository.prepareAiJobArtifactArchive(
      artifact.id,
      userId,
      archiveObjectKey,
    )
    if (pending === null) {
      const latest = await repository.findAiJobArtifactForUser(jobId, userId)
      return latest?.lifecycle === 'saved' ? latest : null
    }

    try {
      await storage.copyAiArtifactObject(artifact.objectKey, archiveObjectKey)
    } catch (error: unknown) {
      try {
        await storage.deleteAiArtifactObject(archiveObjectKey)
        await repository.clearAiJobArtifactPendingArchive(artifact.id, userId, archiveObjectKey)
      } catch (cleanupError: unknown) {
        console.error('Failed to clean up a pending AI archive copy', {jobId}, cleanupError)
      }
      throw error
    }

    const saved = await repository.saveAiJobArtifact(artifact.id, userId, archiveObjectKey, {
      storageQuotaBytes: storageQuotaBytes,
    })
    if (saved === null) {
      try {
        await storage.deleteAiArtifactObject(archiveObjectKey)
        await repository.clearAiJobArtifactPendingArchive(artifact.id, userId, archiveObjectKey)
      } catch (error: unknown) {
        console.error('Failed to remove an over-quota AI archive copy', {jobId}, error)
      }
      return null
    }

    try {
      await storage.deleteAiArtifactObject(artifact.objectKey)
      const cleaned = await repository.clearAiJobArtifactSourceObjectKey(
        artifact.id,
        artifact.objectKey,
      )
      return cleaned ?? saved
    } catch (error: unknown) {
      console.error('Failed to remove the temporary AI artifact after saving', {jobId}, error)
    }

    return saved
  }

  const deleteAiJobArtifactAttempt = async (
    jobId: string,
    userId: string,
    remainingStateRetries: number,
  ): Promise<AiArtifactRecord | null> => {
    const artifact = await repository.findAiJobArtifactForUser(jobId, userId)
    if (artifact === null) {
      return null
    }

    const pending = await repository.claimAiJobArtifactDeletion(artifact.id, {
      expectedLifecycle: artifact.lifecycle,
      expectedObjectKey: artifact.objectKey,
      expectedPendingObjectKey: artifact.pendingObjectKey,
      expectedSourceObjectKey: artifact.sourceObjectKey,
    })
    if (pending === null) {
      return remainingStateRetries > 0
        ? deleteAiJobArtifactAttempt(jobId, userId, remainingStateRetries - 1)
        : repository.findAiJobArtifactForUser(jobId, userId)
    }

    try {
      await storage.deleteAiArtifactObject(pending.objectKey)
      if (pending.pendingObjectKey !== null && pending.pendingObjectKey !== pending.objectKey) {
        await storage.deleteAiArtifactObject(pending.pendingObjectKey)
      }
      if (pending.sourceObjectKey !== null) {
        await storage.deleteAiArtifactObject(pending.sourceObjectKey)
      }
      return (
        (await repository.markAiJobArtifactDeleted(pending.id, {
          expectedLifecycle: pending.lifecycle,
          expectedObjectKey: pending.objectKey,
          expectedPendingObjectKey: pending.pendingObjectKey,
          expectedSourceObjectKey: pending.sourceObjectKey,
        })) ?? (await repository.findAiJobArtifactForUser(jobId, userId))
      )
    } catch (error: unknown) {
      return (
        (await repository.recordAiJobArtifactDeleteFailure(
          pending.id,
          error instanceof Error ? error.message : 'AI artifact deletion failed',
          {
            expectedLifecycle: pending.lifecycle,
            expectedObjectKey: pending.objectKey,
            expectedPendingObjectKey: pending.pendingObjectKey,
            expectedSourceObjectKey: pending.sourceObjectKey,
          },
        )) ?? pending
      )
    }
  }

  const deleteAiJobArtifactForUser = (
    jobId: string,
    userId: string,
  ): Promise<AiArtifactRecord | null> =>
    deleteAiJobArtifactAttempt(jobId, userId, MAXIMUM_ARTIFACT_STATE_RETRIES)

  return {deleteAiJobArtifactForUser, saveAiJobArtifactForUser}
}

const createAiArtifactCleanupService = (
  dependencies: Pick<AiArtifactServiceDependencies, 'clock' | 'repository' | 'storage'>,
) => {
  const {clock, repository, storage} = dependencies

  const cleanupExpiredAiArtifacts = async (): Promise<{
    readonly deleted: number
    readonly failures: number
  }> => {
    const artifacts = await repository.listExpiredAiArtifacts(clock())
    const results = await runArtifactCleanupTasks(artifacts, async (artifact) => {
      let cleanupArtifact = artifact
      try {
        if (artifact.lifecycle === 'deletion_pending') {
          await storage.deleteAiArtifactObject(artifact.objectKey)
          if (
            artifact.pendingObjectKey !== null &&
            artifact.pendingObjectKey !== artifact.objectKey
          ) {
            await storage.deleteAiArtifactObject(artifact.pendingObjectKey)
          }
          if (artifact.sourceObjectKey !== null) {
            await storage.deleteAiArtifactObject(artifact.sourceObjectKey)
          }
          await repository.markAiJobArtifactDeleted(artifact.id, {
            expectedLifecycle: artifact.lifecycle,
            expectedObjectKey: artifact.objectKey,
            expectedPendingObjectKey: artifact.pendingObjectKey,
            expectedSourceObjectKey: artifact.sourceObjectKey,
          })
          return 'deleted' as const
        }

        if (artifact.lifecycle === 'archiving') {
          const claimed = await repository.claimAiJobArtifactArchiveCleanup(artifact.id, {
            expectedLifecycle: artifact.lifecycle,
            expectedObjectKey: artifact.objectKey,
            expectedPendingObjectKey: artifact.pendingObjectKey,
            expectedSourceObjectKey: artifact.sourceObjectKey,
          })
          if (claimed === null) {
            return 'skipped' as const
          }
          cleanupArtifact = claimed
        }

        if (
          cleanupArtifact.lifecycle === 'archive_cleanup_pending' &&
          cleanupArtifact.pendingObjectKey !== null
        ) {
          await storage.deleteAiArtifactObject(cleanupArtifact.pendingObjectKey)
          await repository.clearAiJobArtifactArchiveCleanup(
            cleanupArtifact.id,
            cleanupArtifact.pendingObjectKey,
          )
          return 'deleted' as const
        }

        if (cleanupArtifact.sourceObjectKey === null) {
          await storage.deleteAiArtifactObject(cleanupArtifact.objectKey)
          await repository.markAiJobArtifactDeleted(cleanupArtifact.id, {
            expectedLifecycle: cleanupArtifact.lifecycle,
            expectedObjectKey: cleanupArtifact.objectKey,
            expectedPendingObjectKey: cleanupArtifact.pendingObjectKey,
            expectedSourceObjectKey: cleanupArtifact.sourceObjectKey,
          })
          return 'deleted' as const
        }

        await storage.deleteAiArtifactObject(cleanupArtifact.sourceObjectKey)
        await repository.clearAiJobArtifactSourceObjectKey(
          cleanupArtifact.id,
          cleanupArtifact.sourceObjectKey,
        )
        return 'deleted' as const
      } catch (error: unknown) {
        await repository.recordAiJobArtifactDeleteFailure(
          cleanupArtifact.id,
          error instanceof Error ? error.message : 'AI artifact deletion failed',
          {
            expectedLifecycle: cleanupArtifact.lifecycle,
            expectedObjectKey: cleanupArtifact.objectKey,
            expectedPendingObjectKey: cleanupArtifact.pendingObjectKey,
            expectedSourceObjectKey: cleanupArtifact.sourceObjectKey,
            preserveLifecycle:
              cleanupArtifact.lifecycle === 'archive_cleanup_pending' ||
              cleanupArtifact.lifecycle === 'archiving' ||
              (cleanupArtifact.lifecycle === 'saved' && cleanupArtifact.sourceObjectKey !== null),
          },
        )
        return 'failed' as const
      }
    })

    return {
      deleted: results.filter((result) => result === 'deleted').length,
      failures: results.filter((result) => result === 'failed').length,
    }
  }

  const cleanupExpiredAiIntermediateObjects = async (
    now: Date = clock(),
  ): Promise<{
    readonly deleted: number
    readonly failures: number
  }> => {
    const jobs = await repository.listAiJobsWithExpiredIntermediateArtifacts(now)
    const results = await runArtifactCleanupTasks(jobs, async (job) => {
      const intermediateKeys = await storage.listAiArtifactIntermediateObjectKeys(
        createAiArtifactIntermediateObjectKeyPrefix(job.id),
      )
      // Non-success jobs can leave final objects without artifact rows after ambiguous PUT or cancel outcomes.
      const temporaryKeys =
        job.status === 'succeeded' ? [] : await storage.listAiArtifactTemporaryObjectKeys(job.id)
      const objectKeys = [...intermediateKeys, ...temporaryKeys]
      for (const objectKey of objectKeys) {
        // oxlint-disable-next-line no-await-in-loop -- Bound R2 deletes for one job's orphan files.
        await storage.deleteAiArtifactObject(objectKey)
      }
      await repository.markAiJobIntermediateCleanupCompleted(job.id, now)
      return objectKeys.length
    })

    return {
      deleted: results.reduce((total, deleted) => total + deleted, 0),
      failures: jobs.length - results.length,
    }
  }

  return {cleanupExpiredAiArtifacts, cleanupExpiredAiIntermediateObjects}
}

export const createAiArtifactService = (dependencies: AiArtifactServiceDependencies) => {
  const persistence = createAiArtifactPersistenceService(dependencies)
  const cleanup = createAiArtifactCleanupService(dependencies)

  return {...cleanup, ...persistence}
}
