import type {AiJobPayload} from 'src/server/database'

import {getAiArtifactJobId, getAiArtifactLifecycle} from './artifacts'
import {type AiRunnerJobStatusResponse} from './runner-contract'
import {AiRunnerError} from './runner-error'
import type * as Dispatch from './service-dispatch'
import type * as Repository from 'src/server/repositories/ai-jobs'
import type {AiJobRecord} from 'src/server/repositories/ai-jobs'
import type * as Provider from './provider-jobs'
import {
  asBilledUsage,
  INVALID_OPENAI_RESULT,
  MAXIMUM_PROGRESS,
  OPENAI_RESPONSE_FAILURE,
  OPENAI_RESPONSE_PREFIX,
  SERVER_TEXT_MODEL_ID,
  toCatalogCapability,
} from './service-shared'
import {parseAiJobResult} from './contracts'
import type {retrieveLunaTextJob} from './openai-text'

export interface AiJobSynchronizerDependencies {
  readonly clock: () => Date
  readonly dispatchJob: typeof Dispatch.dispatchJob
  readonly persistAcceptedProvider: typeof Dispatch.persistAcceptedProvider
  readonly expireAiProviderJob: typeof Provider.expireAiProviderJob
  readonly retrieveLunaTextJob: typeof retrieveLunaTextJob
  readonly getRunnerStatus: (jobId: string) => Promise<AiRunnerJobStatusResponse>
  readonly repository: Pick<
    typeof Repository,
    'finalizeAiJob' | 'updateAiJobProgress' | 'requeueAiJobForRunnerRecovery'
  >
}

const finalizeAiProviderJob = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
  input: Parameters<typeof Repository.finalizeAiJob>[1],
): Promise<AiJobRecord> => {
  const finalized = await dependencies.repository.finalizeAiJob(job.id, {
    ...input,
    acceptBeforeTimeout: true,
  })
  if (
    finalized === null ||
    finalized.status !== 'running' ||
    finalized.timeoutAt > dependencies.clock()
  ) {
    return finalized ?? job
  }

  return (await dependencies.expireAiProviderJob(finalized)) ?? finalized
}

const synchronizeOpenAiJob = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
): Promise<AiJobRecord> => {
  if (job.runnerJobId === null || !job.runnerJobId.startsWith(OPENAI_RESPONSE_PREFIX)) {
    return job
  }

  const response = await dependencies.retrieveLunaTextJob(
    job.runnerJobId.slice(OPENAI_RESPONSE_PREFIX.length),
  )
  if (job.timeoutAt <= dependencies.clock()) {
    return (await dependencies.expireAiProviderJob(job)) ?? job
  }

  switch (response.status) {
    case 'completed': {
      const textResult = parseOpenAiTextResult(response.output_text)
      if (textResult === null) {
        return (
          (await finalizeAiProviderJob(dependencies, job, {
            errorCode: INVALID_OPENAI_RESULT,
            errorMessage: 'OpenAI returned text outside the result contract',
            status: 'failed',
          })) ?? job
        )
      }

      return (
        (await finalizeAiProviderJob(dependencies, job, {
          billedUsage: asBilledUsage(response.usage),
          progress: MAXIMUM_PROGRESS,
          result: textResult,
          status: 'succeeded',
        })) ?? job
      )
    }
    case 'cancelled':
      return (
        (await finalizeAiProviderJob(dependencies, job, {
          errorCode: 'cancelled',
          errorMessage: 'OpenAI cancelled the response',
          status: 'cancelled',
        })) ?? job
      )
    case 'failed':
    case 'incomplete':
      return (
        (await finalizeAiProviderJob(dependencies, job, {
          billedUsage: asBilledUsage(response.usage),
          errorCode: OPENAI_RESPONSE_FAILURE,
          errorMessage: response.error?.message ?? `OpenAI response ended with ${response.status}`,
          status: 'failed',
        })) ?? job
      )
    case 'in_progress':
    case 'queued':
      return (
        (await dependencies.repository.updateAiJobProgress(
          job.id,
          Math.max(job.progress, 1),
          job.timeoutAt,
        )) ?? job
      )
    default:
      throw new Error(`Unhandled OpenAI response status: ${response.status ?? 'unknown'}`)
  }
}

const parseOpenAiTextResult = (outputText: unknown): ReturnType<typeof parseAiJobResult> | null => {
  try {
    return parseAiJobResult('text', {text: outputText})
  } catch {
    return null
  }
}

const finalizeInvalidRunnerResult = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
): Promise<AiJobRecord> =>
  (await finalizeAiProviderJob(dependencies, job, {
    errorCode: 'invalid-runner-result',
    errorMessage: 'AI runner returned an invalid result contract',
    status: 'failed',
  })) ?? job

const synchronizeRunnerSuccess = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
  status: AiRunnerJobStatusResponse,
): Promise<AiJobRecord> => {
  let parsedResult: ReturnType<typeof parseAiJobResult>
  try {
    parsedResult = parseAiJobResult(toCatalogCapability(job.capability), status.result ?? {})
    if (
      parsedResult.artifact !== undefined &&
      (getAiArtifactJobId(parsedResult.artifact.objectKey) !== job.id ||
        getAiArtifactLifecycle(parsedResult.artifact.objectKey) !== 'temporary')
    ) {
      throw new TypeError('AI runner artifact does not belong to the Pomo job')
    }
  } catch {
    return finalizeInvalidRunnerResult(dependencies, job)
  }

  return (
    (await finalizeAiProviderJob(dependencies, job, {
      billedUsage: status.metrics as AiJobPayload | null,
      progress: MAXIMUM_PROGRESS,
      result: {
        ...parsedResult,
        metrics: parsedResult.metrics ?? status.metrics ?? undefined,
      },
      status: 'succeeded',
    })) ?? job
  )
}

const synchronizeRunnerFailure = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
  status: AiRunnerJobStatusResponse,
): Promise<AiJobRecord> =>
  (await finalizeAiProviderJob(dependencies, job, {
    billedUsage: status.metrics as AiJobPayload | null,
    errorCode: status.error?.code ?? 'runner-failed',
    errorMessage: status.error?.message ?? 'AI runner failed the job',
    status: 'failed',
  })) ?? job

const synchronizeRunnerCancellation = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
  status: AiRunnerJobStatusResponse,
): Promise<AiJobRecord> =>
  (await finalizeAiProviderJob(dependencies, job, {
    billedUsage: status.metrics as AiJobPayload | null,
    errorCode: 'cancelled',
    errorMessage: status.error?.message ?? 'AI runner cancelled the job',
    status: 'cancelled',
  })) ?? job

const synchronizeRunnerProgress = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
  status: AiRunnerJobStatusResponse,
): Promise<AiJobRecord> =>
  (await dependencies.repository.updateAiJobProgress(
    job.id,
    Math.max(job.progress, status.progress),
    job.timeoutAt,
  )) ?? job

const synchronizeRunnerJob = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
): Promise<AiJobRecord> => {
  if (job.runnerJobId === null) {
    return job
  }

  const status = await dependencies.getRunnerStatus(job.runnerJobId)
  if (status.jobId !== job.runnerJobId) {
    throw new AiRunnerError('invalid-response', 'AI runner returned a different job ID')
  }
  if (job.timeoutAt <= dependencies.clock()) {
    return (await dependencies.expireAiProviderJob(job)) ?? job
  }

  switch (status.status) {
    case 'succeeded':
      return synchronizeRunnerSuccess(dependencies, job, status)
    case 'failed':
      return synchronizeRunnerFailure(dependencies, job, status)
    case 'cancelled':
      return synchronizeRunnerCancellation(dependencies, job, status)
    case 'queued':
    case 'running':
      return synchronizeRunnerProgress(dependencies, job, status)
  }
}

const synchronizeRunningJob = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
): Promise<AiJobRecord> => {
  if (job.timeoutAt <= dependencies.clock()) {
    return (await dependencies.expireAiProviderJob(job)) ?? job
  }

  try {
    return job.modelId === SERVER_TEXT_MODEL_ID
      ? await synchronizeOpenAiJob(dependencies, job)
      : await synchronizeRunnerJob(dependencies, job)
  } catch (error: unknown) {
    if (error instanceof AiRunnerError) {
      if (error.retryable) {
        return job
      }

      return (
        (await finalizeAiProviderJob(dependencies, job, {
          errorCode: `runner-${error.code}`,
          errorMessage: error.message,
          status: 'failed',
        })) ?? job
      )
    }

    console.error('Failed to synchronize running AI job', {jobId: job.id}, error)
    return job
  }
}

const synchronizeRecoveryPendingJob = async (
  dependencies: AiJobSynchronizerDependencies,
  job: AiJobRecord,
): Promise<AiJobRecord> => {
  let recoveryJob = job
  if (job.status === 'queued') {
    try {
      const recovery = await dependencies.persistAcceptedProvider(
        job,
        job.runnerJobId ?? undefined,
        job.lastSubmissionError ?? 'AI provider submission state is unknown',
      )
      if (recovery.status !== 'recovery_pending') {
        return recovery
      }
      recoveryJob = recovery
    } catch (error: unknown) {
      console.error(
        'Failed to promote an unknown AI submission to recovery',
        {jobId: job.id},
        error,
      )
      return job
    }
  }

  if (
    recoveryJob.recoveryDeadlineAt !== null &&
    recoveryJob.recoveryDeadlineAt <= dependencies.clock()
  ) {
    return (await dependencies.expireAiProviderJob(recoveryJob)) ?? recoveryJob
  }

  if (recoveryJob.runnerJobId !== null) {
    try {
      return recoveryJob.runnerJobId.startsWith(OPENAI_RESPONSE_PREFIX)
        ? await synchronizeOpenAiJob(dependencies, recoveryJob)
        : await synchronizeRunnerJob(dependencies, recoveryJob)
    } catch (error: unknown) {
      if (error instanceof AiRunnerError && !error.retryable) {
        return (
          (await finalizeAiProviderJob(dependencies, recoveryJob, {
            errorCode: `provider-${error.code}`,
            errorMessage: error.message,
            status: 'failed',
          })) ?? recoveryJob
        )
      }

      return recoveryJob
    }
  }

  if (recoveryJob.modelId === SERVER_TEXT_MODEL_ID) {
    // OpenAI exposes retrieval by response ID, not a Pomo metadata lookup. Keep this pending for operations.
    return recoveryJob
  }

  const requeued = await dependencies.repository.requeueAiJobForRunnerRecovery(recoveryJob.id)
  if (requeued === null) {
    return recoveryJob
  }

  return (await dependencies.dispatchJob(requeued)).job
}

export const createAiJobSynchronizer = (dependencies: AiJobSynchronizerDependencies) => ({
  finalizeAiProviderJob: finalizeAiProviderJob.bind(undefined, dependencies),
  synchronizeOpenAiJob: synchronizeOpenAiJob.bind(undefined, dependencies),
  synchronizeRecoveryPendingJob: synchronizeRecoveryPendingJob.bind(undefined, dependencies),
  synchronizeRunnerJob: synchronizeRunnerJob.bind(undefined, dependencies),
  synchronizeRunningJob: synchronizeRunningJob.bind(undefined, dependencies),
})
