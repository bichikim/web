import {AiRunnerError, createAiRunnerClient} from './runner-client'
import {createAiRunnerJobRequest} from './runner-contract'
import {
  type AiJobRecord,
  cancelAiJob,
  claimAiJobForDispatch,
  expireAiJob,
  finalizeAiJob,
  findAiJob,
  markAiJobRecoveryPending,
  markAiJobRunning,
  recordAiJobDispatchError,
  releaseAiJobConcurrency,
  reserveAiJobConcurrency,
} from 'src/server/repositories/ai-jobs'

import {getAiModel} from './model-catalog'
import {
  AiProviderAcceptancePersistenceError,
  type DispatchAiJobResult,
  toCatalogCapability,
} from './service-shared'
import {LunaTextSubmissionError, submitLunaTextJob} from './openai-text'
import {cancelAiProviderJob, OPENAI_RESPONSE_PREFIX} from './provider-jobs'

export const persistAcceptedProvider = async (
  job: AiJobRecord,
  runnerJobId: string | undefined,
  errorMessage: string,
): Promise<AiJobRecord> => {
  try {
    const recovery = await markAiJobRecoveryPending(job.id, {
      dispatchLeaseUntil: job.dispatchLeaseUntil ?? job.timeoutAt,
      errorMessage,
      recoveryDeadlineAt: job.timeoutAt,
      runnerJobId,
    })
    if (recovery !== null) {
      return recovery
    }

    const latest = await findAiJob(job.id)
    if (latest !== null && latest.status !== 'queued') {
      return latest
    }

    throw new AiProviderAcceptancePersistenceError(
      `AI provider acceptance could not be recorded for job ${job.id}`,
    )
  } catch (error: unknown) {
    if (error instanceof AiProviderAcceptancePersistenceError) {
      throw error
    }

    throw new AiProviderAcceptancePersistenceError(
      `AI provider acceptance could not be recorded for job ${job.id}`,
      error,
    )
  }
}

const persistAcceptedProviderAfterClaimLoss = async (
  job: AiJobRecord,
  runnerJobId: string,
  errorMessage: string,
): Promise<AiJobRecord> => {
  const persisted = await persistAcceptedProvider(job, runnerJobId, errorMessage)
  const providerWasPersisted = persisted.runnerJobId === runnerJobId
  const terminal =
    persisted.status === 'cancelled' ||
    persisted.status === 'failed' ||
    persisted.status === 'succeeded' ||
    persisted.status === 'timed_out'

  if (providerWasPersisted && !terminal) {
    return persisted
  }

  try {
    await cancelAiProviderJob({...job, runnerJobId})
  } catch (error: unknown) {
    console.error(
      'Failed to cancel an AI provider accepted after the dispatch claim was lost',
      {jobId: job.id},
      error,
    )
  }

  return persisted
}

const dispatchOpenAiJob = async (job: AiJobRecord): Promise<AiJobRecord> => {
  const handle = await submitLunaTextJob(job.id, job.request)
  let running: AiJobRecord | null
  try {
    running = await markAiJobRunning(
      job.id,
      `${OPENAI_RESPONSE_PREFIX}${handle.responseId}`,
      job.timeoutAt,
    )
  } catch (error: unknown) {
    return persistAcceptedProviderAfterClaimLoss(
      job,
      `${OPENAI_RESPONSE_PREFIX}${handle.responseId}`,
      error instanceof Error ? error.message : 'Failed to persist OpenAI response ID',
    )
  }

  if (running === null) {
    return persistAcceptedProviderAfterClaimLoss(
      job,
      `${OPENAI_RESPONSE_PREFIX}${handle.responseId}`,
      'OpenAI accepted the response but the job claim was lost',
    )
  }

  return running
}

const dispatchRunnerJob = async (job: AiJobRecord): Promise<AiJobRecord> => {
  const client = createAiRunnerClient()
  const runnerJob = await client.submit(
    createAiRunnerJobRequest({
      capability: toCatalogCapability(job.capability),
      input: {...job.request},
      jobId: job.id,
      modelId: job.modelId,
    }),
  )
  let running: AiJobRecord | null
  try {
    running = await markAiJobRunning(job.id, runnerJob.jobId, job.timeoutAt)
  } catch (error: unknown) {
    return persistAcceptedProviderAfterClaimLoss(
      job,
      runnerJob.jobId,
      error instanceof Error ? error.message : 'Failed to persist runner job ID',
    )
  }

  if (running === null) {
    return persistAcceptedProviderAfterClaimLoss(
      job,
      runnerJob.jobId,
      'AI runner accepted the job but the durable claim was lost',
    )
  }

  return running
}

const getDispatchResultAfterClaimLoss = async (job: AiJobRecord): Promise<DispatchAiJobResult> => {
  const latest = await findAiJob(job.id)
  if (latest === null) {
    return {job: latest ?? job, kind: 'queued'}
  }
  if (latest.status === 'queued') {
    return {
      job: latest,
      kind: latest.submissionState === 'not_submitted' ? 'queued' : 'recovery-pending',
    }
  }
  if (latest.status === 'recovery_pending') {
    return {job: latest, kind: 'recovery-pending'}
  }

  return {job: latest, kind: latest.status === 'running' ? 'dispatched' : 'terminal'}
}

const isRetryableDispatchError = (error: unknown): boolean =>
  (error instanceof AiRunnerError && error.retryable) ||
  (error instanceof LunaTextSubmissionError && error.retryable)

const getDispatchErrorCode = (error: unknown): string => {
  if (error instanceof AiRunnerError) {
    return `runner-${error.code}`
  }

  return error instanceof LunaTextSubmissionError ? 'openai-submission-rejected' : 'dispatch-failed'
}

const handleDispatchError = async (
  job: AiJobRecord,
  error: unknown,
): Promise<DispatchAiJobResult> => {
  if (error instanceof AiProviderAcceptancePersistenceError) {
    // Keep the durable unknown submission and lease so recovery cannot submit duplicate work.
    console.error('Failed to persist accepted AI provider job', {jobId: job.id}, error)
    return {job, kind: 'recovery-pending'}
  }

  if (error instanceof LunaTextSubmissionError && error.retryable) {
    try {
      const recovery = await persistAcceptedProvider(job, undefined, error.message)
      return {job: recovery, kind: 'recovery-pending'}
    } catch (persistenceError: unknown) {
      console.error(
        'Failed to persist ambiguous OpenAI acceptance',
        {jobId: job.id},
        persistenceError,
      )
      return {job, kind: 'recovery-pending'}
    }
  }

  if (isRetryableDispatchError(error)) {
    await releaseAiJobConcurrency(job.id)
    const queued = await recordAiJobDispatchError(
      job.id,
      error instanceof Error ? error.message : 'AI job dispatch failed',
    )
    return {job: queued ?? job, kind: 'queued'}
  }

  await releaseAiJobConcurrency(job.id)
  const failed = await finalizeAiJob(job.id, {
    errorCode: getDispatchErrorCode(error),
    errorMessage: error instanceof Error ? error.message : 'AI job dispatch failed',
    status: 'failed',
  })
  return {job: failed ?? job, kind: 'terminal'}
}

const dispatchClaimedJob = async (
  job: AiJobRecord,
  runner: 'local-runner' | 'openai',
): Promise<DispatchAiJobResult> => {
  const hasConcurrency = await reserveAiJobConcurrency(job, runner)
  if (!hasConcurrency) {
    const queued = await recordAiJobDispatchError(job.id, 'AI execution concurrency limit reached')
    return queued === null ? getDispatchResultAfterClaimLoss(job) : {job: queued, kind: 'queued'}
  }

  try {
    const running =
      runner === 'openai' ? await dispatchOpenAiJob(job) : await dispatchRunnerJob(job)
    return {
      job: running,
      kind: running.status === 'recovery_pending' ? 'recovery-pending' : 'dispatched',
    }
  } catch (error: unknown) {
    try {
      return await handleDispatchError(job, error)
    } catch (persistenceError: unknown) {
      if (!(persistenceError instanceof AiProviderAcceptancePersistenceError)) {
        throw persistenceError
      }

      console.error('Failed to persist accepted AI provider job', {jobId: job.id}, persistenceError)
      return {job, kind: 'recovery-pending'}
    }
  }
}

export const dispatchJob = async (job: AiJobRecord): Promise<DispatchAiJobResult> => {
  if (job.status !== 'queued') {
    return {
      job,
      kind: job.status === 'recovery_pending' ? 'recovery-pending' : 'terminal',
    }
  }

  const now = new Date()
  if (job.timeoutAt <= now) {
    const expired = await expireAiJob(job.id)
    return {job: expired ?? job, kind: 'terminal'}
  }

  if (job.submissionState !== 'not_submitted') {
    const recovery = await persistAcceptedProvider(
      job,
      job.runnerJobId ?? undefined,
      job.lastSubmissionError ?? 'AI provider submission state is unknown',
    )
    return {job: recovery, kind: 'recovery-pending'}
  }

  const claimed = await claimAiJobForDispatch(job.id, now, job.timeoutAt)
  if (claimed === null) {
    return getDispatchResultAfterClaimLoss(job)
  }

  const model = getAiModel(claimed.modelId)
  if (model === null) {
    const failed = await finalizeAiJob(claimed.id, {
      errorCode: 'model-not-supported',
      errorMessage: `지원하지 않는 서버 AI 모델입니다: ${claimed.modelId}`,
      status: 'failed',
    })
    return failed === null ? {job: claimed, kind: 'terminal'} : {job: failed, kind: 'terminal'}
  }

  return dispatchClaimedJob(claimed, model.runner)
}
