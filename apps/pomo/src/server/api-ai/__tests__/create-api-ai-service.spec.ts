/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {createApiAiService} from '../create-api-ai-service'
import type {
  ApiAiClaim,
  ApiAiProvider,
  ApiAiRepository,
  ApiAiResponse,
  ApiAiServiceDependencies,
} from '../types'

const provider: ApiAiProvider = {
  apiKey: 'key',
  baseUrl: 'https://api.example/v1',
  concurrency: 1,
  id: 'primary',
  models: {'cloud-text': 'text-model'},
  poolId: 'primary',
  webhookSecret: 'secret',
}
const secondary = {...provider, id: 'secondary', poolId: 'secondary'}
const response: ApiAiResponse = {
  failureCode: null,
  fallback: false,
  metadata: {},
  model: 'model',
  outputText: '',
  responseId: 'response-1',
  searchSourceUrls: [],
  status: 'queued',
  tokenCount: 0,
}
const now = new Date('2026-10-08T00:00:00Z')
const claim: ApiAiClaim = {
  attempt: {
    deadlineAt: new Date(now.getTime() + 120_000),
    id: 'attempt-1',
    jobId: 'job-1',
    modelId: 'text-model',
    providerId: 'primary',
    responseId: null,
  },
  job: {
    activeAttemptId: 'attempt-1',
    body: {input: 'hello'},
    cancelRequestedAt: null,
    id: 'job-1',
    kind: 'cloud-text',
    ownerId: 'owner',
    result: null,
    status: 'submitting',
  },
  provider,
}
const repository = {
  claimApiAiAttemptRecovery: vi.fn(),
  claimApiAiCallback: vi.fn(),
  claimApiAiJob: vi.fn(),
  claimApiAiJobDelivery: vi.fn(),
  failUnknownApiAiJob: vi.fn(),
  findApiAiAttempt: vi.fn(),
  findApiAiJob: vi.fn(),
  findApiAiResponseAttempt: vi.fn(),
  listActiveApiAiAttempts: vi.fn(),
  listPendingApiAiCallbacks: vi.fn(),
  listQueuedApiAiJobs: vi.fn(),
  listUndeliveredApiAiJobs: vi.fn(),
  markApiAiCallbackProcessed: vi.fn(),
  markApiAiJobDelivered: vi.fn(),
  recordApiAiResponse: vi.fn(),
  recordApiAiSubmissionError: vi.fn(),
} satisfies ApiAiRepository
const adapter = {cancel: vi.fn(), retrieve: vi.fn(), submit: vi.fn()}
const dependencies: ApiAiServiceDependencies = {
  adapter,
  clock: () => now,
  createAttemptId: () => 'attempt-1',
  deliver: vi.fn(),
  legacyWebhook: vi.fn(),
  providers: () => [provider, secondary],
  repository,
}

beforeEach(() => {
  vi.resetAllMocks()
  repository.claimApiAiJob.mockResolvedValue(null)
  repository.claimApiAiAttemptRecovery.mockResolvedValue(true)
  repository.claimApiAiCallback.mockResolvedValue(true)
  repository.claimApiAiJobDelivery.mockResolvedValue(true)
  repository.listActiveApiAiAttempts.mockResolvedValue([])
  repository.listPendingApiAiCallbacks.mockResolvedValue([])
  repository.listQueuedApiAiJobs.mockResolvedValue([])
  repository.listUndeliveredApiAiJobs.mockResolvedValue([])
  adapter.submit.mockResolvedValue(response)
})

it('should submit once and return before background generation completes', async () => {
  repository.claimApiAiJob.mockResolvedValueOnce(claim)
  await createApiAiService(dependencies).dispatchJob('job-1')
  expect(repository.claimApiAiJob).toHaveBeenCalledWith(
    'job-1',
    [provider, secondary],
    now,
    'attempt-1',
  )
  expect(adapter.submit).toHaveBeenCalledExactlyOnceWith(
    provider,
    expect.objectContaining({
      metadata: {pomo_api_attempt_id: 'attempt-1', pomo_api_job_id: 'job-1'},
      model: 'text-model',
    }),
    'attempt-1',
  )
  expect(adapter.retrieve).not.toHaveBeenCalled()
  expect(repository.recordApiAiResponse).toHaveBeenCalledWith('attempt-1', response, now)
  expect(dependencies.deliver).not.toHaveBeenCalled()
})

it('should switch to the next available provider after a confirmed rate rejection', async () => {
  repository.claimApiAiJob.mockResolvedValueOnce(claim).mockResolvedValueOnce({
    ...claim,
    attempt: {...claim.attempt, id: 'attempt-2', providerId: 'secondary'},
    provider: secondary,
  })
  adapter.submit.mockRejectedValueOnce({status: 429}).mockResolvedValueOnce(response)
  await createApiAiService(dependencies).dispatchJob('job-1')
  expect(repository.recordApiAiSubmissionError).toHaveBeenCalledWith(
    'attempt-1',
    expect.objectContaining({acceptance: 'rejected', fallback: true}),
    now,
  )
  expect(adapter.submit.mock.calls.map(([selected]) => selected.id)).toEqual([
    'primary',
    'secondary',
  ])
})

it('should leave an unacknowledged submission for recovery without replaying it', async () => {
  repository.claimApiAiJob.mockResolvedValueOnce(claim)
  adapter.submit.mockRejectedValueOnce(new Error('connection lost'))
  await createApiAiService(dependencies).dispatchJob('job-1')
  expect(repository.recordApiAiSubmissionError).toHaveBeenCalledWith(
    'attempt-1',
    expect.objectContaining({acceptance: 'unknown', fallback: false}),
    now,
  )
  expect(adapter.submit).toHaveBeenCalledOnce()
})

it('should not classify a database write failure as a provider rejection', async () => {
  repository.claimApiAiJob.mockResolvedValueOnce(claim)
  repository.recordApiAiResponse.mockRejectedValueOnce(new Error('database unavailable'))
  await expect(createApiAiService(dependencies).dispatchJob('job-1')).rejects.toThrow(
    'database unavailable',
  )
  expect(repository.recordApiAiSubmissionError).not.toHaveBeenCalled()
})

it('should recover acceptance from a callback arriving before response ID persistence', async () => {
  repository.listPendingApiAiCallbacks.mockResolvedValueOnce([
    {
      eventId: 'event-1',
      eventType: 'response.completed',
      id: 'callback-1',
      providerId: 'primary',
      responseId: 'response-1',
    },
  ])
  repository.findApiAiResponseAttempt.mockResolvedValue(null)
  repository.findApiAiAttempt.mockResolvedValue(claim.attempt)
  adapter.retrieve.mockResolvedValue({
    ...response,
    metadata: {pomo_api_attempt_id: 'attempt-1', pomo_api_job_id: 'job-1'},
    status: 'completed',
  })
  await createApiAiService(dependencies).recover()
  expect(repository.recordApiAiResponse).toHaveBeenCalledWith(
    'attempt-1',
    expect.objectContaining({status: 'completed'}),
    now,
  )
  expect(repository.markApiAiCallbackProcessed).toHaveBeenCalledWith('callback-1', now)
  expect(dependencies.legacyWebhook).not.toHaveBeenCalled()
})

it('should leave failed result delivery pending for the next recovery run', async () => {
  const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  repository.listUndeliveredApiAiJobs.mockResolvedValueOnce([{...claim.job, status: 'succeeded'}])
  vi.mocked(dependencies.deliver).mockRejectedValueOnce(new Error('quota database unavailable'))
  await createApiAiService(dependencies).recover()
  expect(repository.markApiAiJobDelivered).not.toHaveBeenCalled()
  logger.mockRestore()
})

it('should quarantine the slot of an expired unknown submission', async () => {
  repository.listActiveApiAiAttempts.mockResolvedValueOnce([{...claim.attempt, deadlineAt: now}])
  await createApiAiService(dependencies).recover()
  expect(repository.failUnknownApiAiJob).toHaveBeenCalledWith('job-1', now)
  expect(adapter.cancel).not.toHaveBeenCalled()
  expect(adapter.submit).not.toHaveBeenCalled()
})

it('should recover terminal state when cancellation loses a race with provider completion', async () => {
  repository.listActiveApiAiAttempts.mockResolvedValueOnce([
    {...claim.attempt, deadlineAt: now, responseId: response.responseId},
  ])
  repository.findApiAiJob.mockResolvedValue(null)
  adapter.cancel.mockRejectedValueOnce({status: 409})
  adapter.retrieve.mockResolvedValueOnce({...response, status: 'completed'})
  await createApiAiService(dependencies).recover()
  expect(repository.recordApiAiResponse).toHaveBeenCalledWith(
    'attempt-1',
    expect.objectContaining({status: 'completed'}),
    now,
  )
  expect(repository.failUnknownApiAiJob).not.toHaveBeenCalled()
})
