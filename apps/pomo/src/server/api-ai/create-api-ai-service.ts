import {API_AI_POLICY} from 'src/server/api-ai/policy'
// oxlint-disable eslint-js/camelcase -- Provider metadata uses the Responses wire contract.
// oxlint-disable no-await-in-loop -- Dispatch and recovery advance each durable attempt in order.
import type {
  ApiAiAttempt,
  ApiAiCallback,
  ApiAiClaim,
  ApiAiJob,
  ApiAiProvider,
  ApiAiResponse,
  ApiAiService,
  ApiAiServiceDependencies,
} from './types'
import {classifyApiAiSubmissionError} from './submission-error'
import {isApiAiJobActive} from './status'

const dispatchClaim = async (
  dependencies: ApiAiServiceDependencies,
  claim: ApiAiClaim,
): Promise<void> => {
  const body = {
    ...claim.job.body,
    metadata: {
      ...(typeof claim.job.body.metadata === 'object' && claim.job.body.metadata !== null
        ? claim.job.body.metadata
        : {}),
      pomo_api_attempt_id: claim.attempt.id,
      pomo_api_job_id: claim.job.id,
    },
    model: claim.attempt.modelId,
  }
  let response: ApiAiResponse
  try {
    if (claim.provider.protocol === 'openrouter-responses-queue') {
      if (dependencies.queue === undefined) {
        throw new TypeError('Queued AI execution is not configured')
      }
      response = await dependencies.queue.adapter.submit(
        claim.provider,
        body,
        claim.attempt.id,
        Math.max(1, claim.attempt.deadlineAt.getTime() - dependencies.clock().getTime()),
      )
    } else {
      response = await dependencies.adapter.submit(claim.provider, body, claim.attempt.id)
    }
  } catch (error: unknown) {
    const now = dependencies.clock()
    await dependencies.repository.recordApiAiSubmissionError(
      claim.attempt.id,
      classifyApiAiSubmissionError(error, now.getTime()),
      now,
    )
    return
  }
  // Acceptance persistence errors must leave the submission reserved for callback recovery.
  await dependencies.repository.recordApiAiResponse(
    claim.attempt.id,
    response,
    dependencies.clock(),
  )
}

const deliverJobs = async (
  dependencies: ApiAiServiceDependencies,
  deadline: number,
): Promise<void> => {
  const jobs = await dependencies.repository.listUndeliveredApiAiJobs(dependencies.clock())
  for (const job of jobs) {
    const now = dependencies.clock()
    if (now.getTime() >= deadline) {
      return
    }
    try {
      if (await dependencies.repository.claimApiAiJobDelivery(job.id, now)) {
        await dependencies.deliver(job)
        await dependencies.repository.markApiAiJobDelivered(job.id, dependencies.clock())
      }
    } catch (error: unknown) {
      console.error('Failed to deliver AI job result', {jobId: job.id}, error)
    }
  }
}

const processCallback = async (
  dependencies: ApiAiServiceDependencies,
  providers: ReadonlyArray<ApiAiProvider>,
  callback: ApiAiCallback,
  now: Date,
): Promise<void> => {
  try {
    if (!(await dependencies.repository.claimApiAiCallback(callback.id, now))) {
      return
    }
    const provider = providers.find((candidate) => candidate.id === callback.providerId)
    if (provider === undefined) {
      throw new Error(`AI callback provider is not configured: ${callback.providerId}`)
    }
    if (provider.protocol === 'openrouter-responses-queue') {
      throw new TypeError('Queued AI providers do not issue background callbacks')
    }
    const response = await dependencies.adapter.retrieve(provider, callback.responseId)
    const recorded = await dependencies.repository.findApiAiResponseAttempt(
      provider.id,
      response.responseId,
    )
    const attemptId = response.metadata.pomo_api_attempt_id
    const attempt =
      recorded ??
      (attemptId === undefined ? null : await dependencies.repository.findApiAiAttempt(attemptId))
    if (
      attempt !== null &&
      attempt.providerId === provider.id &&
      attempt.jobId === response.metadata.pomo_api_job_id
    ) {
      await dependencies.repository.recordApiAiResponse(attempt.id, response, dependencies.clock())
    } else if (provider.id === 'openai' && attemptId === undefined) {
      await dependencies.legacyWebhook({
        data: {id: callback.responseId},
        id: callback.eventId,
        type: callback.eventType,
      })
    }
    await dependencies.repository.markApiAiCallbackProcessed(callback.id, dependencies.clock())
  } catch (error: unknown) {
    console.error('Failed to process AI callback', {callbackId: callback.id}, error)
  }
}

const processCallbacks = async (
  dependencies: ApiAiServiceDependencies,
  providers: ReadonlyArray<ApiAiProvider>,
  deadline: number,
): Promise<void> => {
  for (const callback of await dependencies.repository.listPendingApiAiCallbacks(
    dependencies.clock(),
  )) {
    const now = dependencies.clock()
    if (now.getTime() >= deadline) {
      return
    }
    await processCallback(dependencies, providers, callback, now)
  }
}

const recoverSubmittedAttempt = async (
  dependencies: ApiAiServiceDependencies,
  providers: ReadonlyArray<ApiAiProvider>,
  attempt: ApiAiAttempt,
  now: Date,
): Promise<void> => {
  const provider = providers.find((candidate) => candidate.id === attempt.providerId)
  if (attempt.responseId === null || provider?.protocol === 'openrouter-responses-queue') {
    if (attempt.deadlineAt <= now) {
      await dependencies.repository.failUnknownApiAiJob(attempt.jobId, now)
    }
  } else if (provider !== undefined) {
    const {responseId} = attempt
    try {
      const job = await dependencies.repository.findApiAiJob(attempt.jobId)
      const response =
        attempt.deadlineAt <= now || (job !== null && job.cancelRequestedAt !== null)
          ? await dependencies.adapter
              .cancel(provider, responseId)
              .catch(() => dependencies.adapter.retrieve(provider, responseId))
          : await dependencies.adapter.retrieve(provider, attempt.responseId)
      await dependencies.repository.recordApiAiResponse(attempt.id, response, now)
      if (
        attempt.deadlineAt <= now &&
        (response.status === 'queued' || response.status === 'in_progress')
      ) {
        await dependencies.repository.failUnknownApiAiJob(attempt.jobId, now)
      }
    } catch (error: unknown) {
      if (attempt.deadlineAt <= now) {
        await dependencies.repository.failUnknownApiAiJob(attempt.jobId, now)
      }
      console.error('Failed to recover AI provider attempt', {attemptId: attempt.id}, error)
    }
  }
}

const recoverAttempt = async (
  dependencies: ApiAiServiceDependencies,
  providers: ReadonlyArray<ApiAiProvider>,
  attempt: ApiAiAttempt,
  now: Date,
): Promise<void> => {
  if (await dependencies.repository.claimApiAiAttemptRecovery(attempt.id, now)) {
    await recoverSubmittedAttempt(dependencies, providers, attempt, now)
  }
}

const monitorBackgroundJob = async (
  dependencies: ApiAiServiceDependencies,
  jobId: string,
): Promise<void> => {
  const job = await dependencies.repository.findApiAiJob(jobId)
  if (job === null || !isApiAiJobActive(job.status) || job.activeAttemptId === null) {
    return
  }
  const attempt = await dependencies.repository.findApiAiAttempt(job.activeAttemptId)
  if (attempt !== null) {
    await recoverSubmittedAttempt(
      dependencies,
      dependencies.providers(),
      attempt,
      dependencies.clock(),
    )
  }
}

const recoverAttempts = async (
  dependencies: ApiAiServiceDependencies,
  providers: ReadonlyArray<ApiAiProvider>,
  deadline: number,
): Promise<void> => {
  for (const attempt of await dependencies.repository.listActiveApiAiAttempts(
    dependencies.clock(),
  )) {
    const now = dependencies.clock()
    if (now.getTime() >= deadline) {
      return
    }
    await recoverAttempt(dependencies, providers, attempt, now)
  }
}

/** Composes durable dispatch, callback completion, fallback and recovery. */
export const createApiAiService = (dependencies: ApiAiServiceDependencies): ApiAiService => {
  const executeJob = async (
    jobId: string,
    deadline = dependencies.clock().getTime() + API_AI_POLICY.invocationMilliseconds,
    queued = false,
  ): Promise<void> => {
    const catalog = dependencies.providers()
    const providers = await dependencies.repository.resolveApiAiJobProviders(
      jobId,
      catalog,
      dependencies.defaultProviders?.() ?? catalog,
    )
    const queuedProviders = providers.filter(
      (provider) => provider.protocol === 'openrouter-responses-queue',
    )
    if (!queued && (queuedProviders.length > 0 || dependencies.queue?.monitorBackground === true)) {
      const job = await dependencies.repository.findApiAiJob(jobId)
      if (
        job?.status === 'queued' &&
        (queuedProviders.some((provider) => provider.models[job.kind] !== undefined) ||
          (dependencies.queue?.monitorBackground === true && job.kind === 'cloud-text'))
      ) {
        if (dependencies.queue === undefined) {
          throw new TypeError('Queued AI execution is not configured')
        }
        await dependencies.queue.enqueue(jobId)
        return
      }
    }
    for (let round = 0; round < API_AI_POLICY.maximumAttempts; round += 1) {
      if (dependencies.clock().getTime() >= deadline) {
        return
      }
      const claim = await dependencies.repository.claimApiAiJob(
        jobId,
        providers,
        dependencies.clock(),
        dependencies.createAttemptId(),
      )
      if (claim === null) {
        return
      }
      await dispatchClaim(dependencies, claim)
    }
  }
  const dispatchJob = (jobId: string, deadline?: number): Promise<void> =>
    executeJob(jobId, deadline)
  const executeQueuedJob = async (jobId: string): Promise<void> => {
    const deadline = dependencies.clock().getTime() + API_AI_POLICY.invocationMilliseconds
    await executeJob(jobId, deadline, true)
    if (dependencies.queue?.monitorBackground === true) {
      await monitorBackgroundJob(dependencies, jobId)
    }
    await deliverJobs(dependencies, deadline)
    const job = await dependencies.repository.findApiAiJob(jobId)
    if (
      job?.status === 'queued' ||
      (dependencies.queue?.monitorBackground === true &&
        job !== null &&
        isApiAiJobActive(job.status))
    ) {
      throw new Error('AI job is waiting for completion or recovery')
    }
  }
  const dispatch = async (
    deadline = dependencies.clock().getTime() + API_AI_POLICY.invocationMilliseconds,
  ): Promise<void> => {
    await dependencies.repository.expireQueuedApiAiJobs(dependencies.clock())
    for (const job of await dependencies.repository.listQueuedApiAiJobs(dependencies.clock())) {
      try {
        await dispatchJob(job.id, deadline)
      } catch (error: unknown) {
        console.error('Failed to dispatch AI job', {jobId: job.id}, error)
      }
    }
    await deliverJobs(dependencies, deadline)
  }
  const complete = async (): Promise<void> => {
    const deadline = dependencies.clock().getTime() + API_AI_POLICY.invocationMilliseconds
    await processCallbacks(dependencies, dependencies.providers(), deadline)
    await deliverJobs(dependencies, deadline)
    await dispatch(deadline)
  }
  const recover = async (): Promise<void> => {
    const providers = dependencies.providers()
    const deadline = dependencies.clock().getTime() + API_AI_POLICY.invocationMilliseconds
    await processCallbacks(dependencies, providers, deadline)
    await recoverAttempts(dependencies, providers, deadline)
    await deliverJobs(dependencies, deadline)
    await dispatch(deadline)
  }
  return {complete, dispatch, dispatchJob, executeQueuedJob, recover}
}
