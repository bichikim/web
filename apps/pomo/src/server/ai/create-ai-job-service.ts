import type {env} from 'src/env'

import type * as Repository from 'src/server/repositories/ai-jobs'

import {type CreateAiJobRequest, parseAiJobInput} from './contracts'
import type * as Storage from './artifacts'
import {getAiModel, isAiModelProductionEnabled} from './model-catalog'
import {type AiCreditProfile, getAiCreditEstimate} from './policy'
import type {cancelAiProviderJob, expireAiProviderJob} from './provider-jobs'
import {AiRunnerError} from './runner-error'
import type {dispatchJob} from './service-dispatch'
import {createPublicAiJobService} from './service-public'
import {createAiRecoveryService} from './service-recovery'
import {
  calculateRequestHash,
  type CreateAiJobServiceResult,
  createTimeout,
  parseCreditProfile,
  SERVER_TEXT_MODEL_ID,
  toDatabaseCapability,
} from './service-shared'
import {createAiArtifactService} from './service-artifacts'
import type {createAiJobSynchronizer} from './service-sync'
import type {AiJobRecord} from 'src/server/repositories/ai-jobs'

export interface AiTextAccess {
  readonly available: boolean
  readonly modelId: string | null
}

export interface AiJobServiceDependencies {
  readonly clock: () => Date
  readonly config: Pick<
    typeof env,
    | 'POMO_AI_STORAGE_QUOTA_BYTES'
    | 'POMO_AI_SUBSCRIPTION_PRODUCT_CODE'
    | 'POMO_AI_CREDIT_PROFILE_JSON'
    | 'POMO_AI_MONTHLY_CREDIT_CAP'
    | 'POMO_AI_RUNNER_TIMEOUT_MS'
    | 'POMO_AI_QUEUE_LIMIT'
  >
  readonly repository: Pick<
    typeof Repository,
    | 'cancelAiJob'
    | 'claimAiJobArtifactArchiveCleanup'
    | 'claimAiJobArtifactDeletion'
    | 'clearAiJobArtifactArchiveCleanup'
    | 'clearAiJobArtifactPendingArchive'
    | 'clearAiJobArtifactSourceObjectKey'
    | 'createAiJob'
    | 'findAiJobArtifactForUser'
    | 'findAiJobForUser'
    | 'getUsagePeriodStart'
    | 'hasActiveAiEntitlement'
    | 'listAiJobsWithExpiredIntermediateArtifacts'
    | 'listDispatchableAiJobs'
    | 'listExpiredAiArtifacts'
    | 'listExpiredAiJobs'
    | 'listRecoveryPendingAiJobs'
    | 'listRunningAiJobs'
    | 'markAiJobArtifactDeleted'
    | 'markAiJobIntermediateCleanupCompleted'
    | 'prepareAiJobArtifactArchive'
    | 'purgeExpiredAiCostLedger'
    | 'recordAiJobArtifactDeleteFailure'
    | 'saveAiJobArtifact'
  >
  readonly storage: Pick<
    typeof Storage,
    | 'copyAiArtifactObject'
    | 'createAiArtifactDownloadUrl'
    | 'deleteAiArtifactObject'
    | 'listAiArtifactIntermediateObjectKeys'
    | 'listAiArtifactTemporaryObjectKeys'
  >
  readonly dispatchJob: typeof dispatchJob
  readonly cancelAiProviderJob: typeof cancelAiProviderJob
  readonly expireAiProviderJob: typeof expireAiProviderJob
  readonly synchronizer: ReturnType<typeof createAiJobSynchronizer>
}

const getAiTextAccess = async (
  dependencies: AiJobServiceDependencies,
  userId: string,
): Promise<AiTextAccess> => {
  const {config, repository} = dependencies
  const model = getAiModel(SERVER_TEXT_MODEL_ID)
  if (model === null || !isAiModelProductionEnabled(model)) {
    return {available: false, modelId: null}
  }

  const available = await repository.hasActiveAiEntitlement(
    userId,
    config.POMO_AI_SUBSCRIPTION_PRODUCT_CODE,
  )
  return {available, modelId: available ? SERVER_TEXT_MODEL_ID : null}
}

const submitAiJob = async (
  dependencies: AiJobServiceDependencies,
  userId: string,
  request: CreateAiJobRequest,
): Promise<CreateAiJobServiceResult> => {
  const {clock, config, repository, dispatchJob} = dependencies
  const modelId = request.modelId ?? (request.capability === 'text' ? SERVER_TEXT_MODEL_ID : '')
  const normalizedRequest = {...request, modelId}
  const model = getAiModel(modelId)
  if (
    model === null ||
    model.capability !== request.capability ||
    !isAiModelProductionEnabled(model)
  ) {
    return {code: 'model-not-supported', kind: 'error'}
  }

  let parsedInput: ReturnType<typeof parseAiJobInput>
  try {
    parsedInput = parseAiJobInput(request.capability, normalizedRequest.input)
  } catch {
    return {code: 'invalid-input', kind: 'error'}
  }

  const now = clock()
  let creditProfile: AiCreditProfile | undefined
  try {
    creditProfile = parseCreditProfile(config.POMO_AI_CREDIT_PROFILE_JSON)
  } catch (error: unknown) {
    console.error('Invalid AI credit profile configuration', error)
    return {code: 'configuration-error', kind: 'error'}
  }
  const creditEstimate = getAiCreditEstimate(
    request.capability,
    parsedInput as Readonly<Record<string, unknown>>,
    creditProfile,
  )
  if (
    creditProfile !== undefined &&
    (creditEstimate.credits === null || config.POMO_AI_MONTHLY_CREDIT_CAP === undefined)
  ) {
    return {code: 'configuration-error', kind: 'error'}
  }
  const result = await repository.createAiJob(
    {
      capability: toDatabaseCapability(request.capability),
      estimatedCredits: creditEstimate.credits,
      idempotencyKey: request.idempotencyKey,
      modelId,
      quotaUnits: 1,
      request: parsedInput as Readonly<Record<string, unknown>>,
      requestHash: calculateRequestHash({...normalizedRequest, input: parsedInput}),
      timeoutAt: createTimeout(now, config.POMO_AI_RUNNER_TIMEOUT_MS),
      usagePeriodStart: repository.getUsagePeriodStart(now),
      userId,
    },
    {
      maxQueueLength: config.POMO_AI_QUEUE_LIMIT,
      monthlyCreditCap: config.POMO_AI_MONTHLY_CREDIT_CAP,
      now,
      productCode: config.POMO_AI_SUBSCRIPTION_PRODUCT_CODE,
    },
  )

  switch (result.kind) {
    case 'idempotency-conflict':
      return {code: 'idempotency-conflict', kind: 'error'}
    case 'not-entitled':
      return {code: 'not-entitled', kind: 'error'}
    case 'queue-exceeded':
      return {code: 'queue-exceeded', kind: 'error'}
    case 'quota-exceeded':
      return {code: 'quota-exceeded', kind: 'error'}
    case 'created':
    case 'existing': {
      const dispatched = await dispatchJob(result.job)
      return {
        created: result.kind === 'created',
        job: dispatched.job,
        kind: 'accepted',
      }
    }
  }
}

const getAiJobStatus = async (
  dependencies: AiJobServiceDependencies,
  jobId: string,
  userId: string,
): Promise<AiJobRecord | null> => {
  const {clock, repository, dispatchJob, expireAiProviderJob} = dependencies
  const {
    synchronizeOpenAiJob,
    synchronizeRecoveryPendingJob,
    synchronizeRunnerJob,
    finalizeAiProviderJob,
  } = dependencies.synchronizer
  const job = await repository.findAiJobForUser(jobId, userId)
  if (job === null) {
    return null
  }

  if (job.status === 'queued') {
    return (await dispatchJob(job)).job
  }

  if (job.status === 'recovery_pending') {
    return synchronizeRecoveryPendingJob(job)
  }

  if (job.status !== 'running') {
    return job
  }

  if (job.timeoutAt <= clock()) {
    return (await expireAiProviderJob(job)) ?? job
  }

  try {
    return job.modelId === SERVER_TEXT_MODEL_ID
      ? await synchronizeOpenAiJob(job)
      : await synchronizeRunnerJob(job)
  } catch (error: unknown) {
    if (error instanceof AiRunnerError) {
      if (error.retryable) {
        return job
      }

      return (
        (await finalizeAiProviderJob(job, {
          errorCode: `runner-${error.code}`,
          errorMessage: error.message,
          status: 'failed',
        })) ?? job
      )
    }

    throw error
  }
}

const cancelAiJobForUser = async (
  dependencies: AiJobServiceDependencies,
  jobId: string,
  userId: string,
): Promise<AiJobRecord | null> => {
  const {repository, cancelAiProviderJob} = dependencies
  const job = await repository.findAiJobForUser(jobId, userId)
  if (
    job === null ||
    job.status === 'succeeded' ||
    job.status === 'failed' ||
    job.status === 'cancelled' ||
    job.status === 'timed_out'
  ) {
    return job
  }

  if (job.status === 'queued') {
    return repository.cancelAiJob(job.id, {
      providerCostUnknown: job.submissionState !== 'not_submitted' || job.runnerJobId !== null,
    })
  }

  if (job.runnerJobId === null) {
    return job.status === 'recovery_pending'
      ? repository.cancelAiJob(job.id, {providerCostUnknown: true})
      : job
  }

  await cancelAiProviderJob(job)

  return repository.cancelAiJob(job.id)
}

export const createAiJobService = (dependencies: AiJobServiceDependencies) => {
  const {clock, config, repository, storage, dispatchJob, expireAiProviderJob} = dependencies
  const {synchronizeRecoveryPendingJob, synchronizeRunningJob} = dependencies.synchronizer
  const artifactService = createAiArtifactService({
    clock,
    repository: {
      claimAiJobArtifactArchiveCleanup: repository.claimAiJobArtifactArchiveCleanup,
      claimAiJobArtifactDeletion: repository.claimAiJobArtifactDeletion,
      clearAiJobArtifactArchiveCleanup: repository.clearAiJobArtifactArchiveCleanup,
      clearAiJobArtifactPendingArchive: repository.clearAiJobArtifactPendingArchive,
      clearAiJobArtifactSourceObjectKey: repository.clearAiJobArtifactSourceObjectKey,
      findAiJobArtifactForUser: repository.findAiJobArtifactForUser,
      listAiJobsWithExpiredIntermediateArtifacts:
        repository.listAiJobsWithExpiredIntermediateArtifacts,
      listExpiredAiArtifacts: repository.listExpiredAiArtifacts,
      markAiJobArtifactDeleted: repository.markAiJobArtifactDeleted,
      markAiJobIntermediateCleanupCompleted: repository.markAiJobIntermediateCleanupCompleted,
      prepareAiJobArtifactArchive: repository.prepareAiJobArtifactArchive,
      purgeExpiredAiCostLedger: repository.purgeExpiredAiCostLedger,
      recordAiJobArtifactDeleteFailure: repository.recordAiJobArtifactDeleteFailure,
      saveAiJobArtifact: repository.saveAiJobArtifact,
    },
    storage: {
      copyAiArtifactObject: storage.copyAiArtifactObject,
      deleteAiArtifactObject: storage.deleteAiArtifactObject,
      listAiArtifactIntermediateObjectKeys: storage.listAiArtifactIntermediateObjectKeys,
      listAiArtifactTemporaryObjectKeys: storage.listAiArtifactTemporaryObjectKeys,
    },
    storageQuotaBytes: config.POMO_AI_STORAGE_QUOTA_BYTES,
  })

  const publicService = createPublicAiJobService({
    clock,
    createDownloadUrl: storage.createAiArtifactDownloadUrl,
    findArtifactForUser: repository.findAiJobArtifactForUser,
  })

  const recoveryService = createAiRecoveryService({
    cleanupExpiredAiArtifacts: artifactService.cleanupExpiredAiArtifacts,
    cleanupExpiredAiIntermediateObjects: artifactService.cleanupExpiredAiIntermediateObjects,
    clock,
    dispatchJob,
    expireProviderJob: expireAiProviderJob,
    listDispatchableAiJobs: repository.listDispatchableAiJobs,
    listExpiredAiJobs: repository.listExpiredAiJobs,
    listRecoveryPendingAiJobs: repository.listRecoveryPendingAiJobs,
    listRunningAiJobs: repository.listRunningAiJobs,
    purgeExpiredAiCostLedger: repository.purgeExpiredAiCostLedger,
    synchronizeRecoveryPendingJob,
    synchronizeRunningJob,
  })

  const {createAiJobResult: createPublicAiJobResult} = publicService
  const {
    deleteAiJobArtifactForUser: deleteArtifactForUser,
    saveAiJobArtifactForUser: saveArtifactForUser,
  } = artifactService
  const {recoverAiJobs: recoverAllAiJobs} = recoveryService

  const createAiJobResult = createPublicAiJobResult
  const saveAiJobArtifactForUser = saveArtifactForUser
  const deleteAiJobArtifactForUser = deleteArtifactForUser
  const recoverAiJobs = recoverAllAiJobs

  return {
    cancelAiJobForUser: cancelAiJobForUser.bind(undefined, dependencies),
    createAiJobResult,
    deleteAiJobArtifactForUser,
    getAiJobStatus: getAiJobStatus.bind(undefined, dependencies),
    getAiTextAccess: getAiTextAccess.bind(undefined, dependencies),
    recoverAiJobs,
    saveAiJobArtifactForUser,
    submitAiJob: submitAiJob.bind(undefined, dependencies),
  }
}
