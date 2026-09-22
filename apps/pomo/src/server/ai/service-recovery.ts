import type {
  AiJobRecord,
  listDispatchableAiJobs,
  listExpiredAiJobs,
  listRecoveryPendingAiJobs,
  listRunningAiJobs,
  purgeExpiredAiCostLedger,
} from 'src/server/repositories/ai-jobs'

import {type DispatchAiJobResult, MAXIMUM_RECOVERY_CONCURRENCY} from './service-shared'

export interface AiRecoveryServiceDependencies {
  readonly clock: () => Date
  readonly cleanupExpiredAiArtifacts: () => Promise<{
    readonly deleted: number
    readonly failures: number
  }>
  readonly cleanupExpiredAiIntermediateObjects: (
    now?: Date,
  ) => Promise<{readonly deleted: number; readonly failures: number}>
  readonly dispatchJob: (job: AiJobRecord) => Promise<DispatchAiJobResult>
  readonly expireProviderJob: (job: AiJobRecord) => Promise<AiJobRecord | null>
  readonly listDispatchableAiJobs: typeof listDispatchableAiJobs
  readonly listExpiredAiJobs: typeof listExpiredAiJobs
  readonly listRecoveryPendingAiJobs: typeof listRecoveryPendingAiJobs
  readonly listRunningAiJobs: typeof listRunningAiJobs
  readonly purgeExpiredAiCostLedger: typeof purgeExpiredAiCostLedger
  readonly synchronizeRecoveryPendingJob: (job: AiJobRecord) => Promise<AiJobRecord>
  readonly synchronizeRunningJob: (job: AiJobRecord) => Promise<AiJobRecord>
}

const runRecoveryTasks = async <Job, Result>(
  jobs: ReadonlyArray<Job>,
  operation: (job: Job) => Promise<Result>,
): Promise<Array<Awaited<Result>>> => {
  const results: Array<Awaited<Result>> = []

  for (let offset = 0; offset < jobs.length; offset += MAXIMUM_RECOVERY_CONCURRENCY) {
    const batch = jobs.slice(offset, offset + MAXIMUM_RECOVERY_CONCURRENCY)
    // oxlint-disable-next-line no-await-in-loop -- Bound provider calls without a burst of requests.
    const batchResults = await Promise.all(
      batch.map(async (job) => {
        try {
          return await operation(job)
        } catch (error: unknown) {
          const jobId =
            typeof job === 'object' && job !== null && 'id' in job
              ? {jobId: String(job.id)}
              : undefined
          console.error('Failed to process an AI recovery item', jobId, error)
          return null
        }
      }),
    )
    results.push(...batchResults.filter((result): result is Awaited<Result> => result !== null))
  }

  return results
}

export const createAiRecoveryService = (dependencies: AiRecoveryServiceDependencies) => {
  const recoverAiJobs = async () => {
    const now = dependencies.clock()
    const running = await dependencies.listRunningAiJobs(now)
    await runRecoveryTasks(running, dependencies.synchronizeRunningJob)

    const recoveryPending = await dependencies.listRecoveryPendingAiJobs(now)
    const recoveryResults = await runRecoveryTasks(
      recoveryPending,
      dependencies.synchronizeRecoveryPendingJob,
    )

    const dispatchable = await dependencies.listDispatchableAiJobs(dependencies.clock())
    const dispatchResults = await runRecoveryTasks(dispatchable, dependencies.dispatchJob)
    const expired = await dependencies.listExpiredAiJobs(dependencies.clock())
    const completions = await runRecoveryTasks(
      expired,
      async (job) => (await dependencies.expireProviderJob(job)) !== null,
    )
    const artifactCleanup = await dependencies.cleanupExpiredAiArtifacts()
    const intermediateCleanup = await dependencies.cleanupExpiredAiIntermediateObjects(now)
    const costRecordsPurged = await dependencies.purgeExpiredAiCostLedger(now)

    return {
      artifactDeletionFailures: artifactCleanup.failures,
      artifactsDeleted: artifactCleanup.deleted,
      checked: running.length + recoveryPending.length + dispatchable.length + expired.length,
      costRecordsPurged,
      dispatched: dispatchResults.filter(({kind}) => kind === 'dispatched').length,
      expired: completions.filter(Boolean).length,
      intermediateDeletionFailures: intermediateCleanup.failures,
      intermediateObjectsDeleted: intermediateCleanup.deleted,
      recoveryPending: recoveryResults.length,
    }
  }

  return {recoverAiJobs}
}
