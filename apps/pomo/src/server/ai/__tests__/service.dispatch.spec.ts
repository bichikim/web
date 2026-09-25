/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const environmentMocks = vi.hoisted(() => ({
  env: {
    OPENAI_MODEL: 'gpt-5.6-luna',
    OPENAI_REASONING_EFFORT: 'medium',
    POMO_AI_CREDIT_PROFILE_JSON: undefined as string | undefined,
    POMO_AI_MONTHLY_CREDIT_CAP: undefined as number | undefined,
    POMO_AI_QUEUE_LIMIT: 100,
    POMO_AI_RUNNER_TIMEOUT_MS: 120_000,
    POMO_AI_RUNNER_TOKEN: undefined as string | undefined,
    POMO_AI_RUNNER_URL: undefined as string | undefined,
    POMO_AI_SUBSCRIPTION_PRODUCT_CODE: 'pomo-ai-service',
  },
}))

const repositoryMocks = vi.hoisted(() => ({
  cancelAiJob: vi.fn(),
  claimAiJobArtifactArchiveCleanup: vi.fn(),
  claimAiJobArtifactDeletion: vi.fn(),
  claimAiJobForDispatch: vi.fn(),
  clearAiJobArtifactArchiveCleanup: vi.fn(),
  clearAiJobArtifactPendingArchive: vi.fn(),
  clearAiJobArtifactSourceObjectKey: vi.fn(),
  createAiJob: vi.fn(),
  expireAiJob: vi.fn(),
  finalizeAiJob: vi.fn(),
  findAiJob: vi.fn(),
  findAiJobArtifactForUser: vi.fn(),
  findAiJobForUser: vi.fn(),
  getUsagePeriodStart: vi.fn(() => '2026-09-01'),
  listAiJobsWithExpiredIntermediateArtifacts: vi.fn(),
  listDispatchableAiJobs: vi.fn(),
  listExpiredAiArtifacts: vi.fn(),
  listExpiredAiJobs: vi.fn(),
  listRecoveryPendingAiJobs: vi.fn(),
  listRunningAiJobs: vi.fn(),
  markAiJobArtifactDeleted: vi.fn(),
  markAiJobIntermediateCleanupCompleted: vi.fn(),
  markAiJobRecoveryPending: vi.fn(),
  markAiJobRunning: vi.fn(),
  prepareAiJobArtifactArchive: vi.fn(),
  purgeExpiredAiCostLedger: vi.fn(),
  recordAiJobArtifactDeleteFailure: vi.fn(),
  recordAiJobDispatchError: vi.fn(),
  releaseAiJobConcurrency: vi.fn(),
  requeueAiJobForRunnerRecovery: vi.fn(),
  reserveAiJobConcurrency: vi.fn(),
  saveAiJobArtifact: vi.fn(),
  updateAiJobProgress: vi.fn(),
}))

const openAiMocks = vi.hoisted(() => ({
  cancelLunaTextJob: vi.fn(),
  retrieveLunaTextJob: vi.fn(),
  submitLunaTextJob: vi.fn(),
}))

const runnerMocks = vi.hoisted(() => ({
  createAiRunnerClient: vi.fn(),
}))

const artifactMocks = vi.hoisted(() => ({
  copyAiArtifactObject: vi.fn(),
  createAiArtifactDownloadUrl: vi.fn(),
  deleteAiArtifactObject: vi.fn(),
  listAiArtifactIntermediateObjectKeys: vi.fn(),
}))

vi.mock('src/env', () => environmentMocks)
vi.mock('src/server/repositories/ai-jobs', () => repositoryMocks)
vi.mock('../openai-text', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../openai-text')>()
  return {...actual, ...openAiMocks}
})
vi.mock('../runner-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../runner-client')>()
  return {...actual, createAiRunnerClient: runnerMocks.createAiRunnerClient}
})
vi.mock('../artifacts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../artifacts')>()
  return {...actual, ...artifactMocks}
})

import {
  cancelAiJobForUser,
  createAiJobResult,
  createPublicJob,
  getAiJobStatus,
  recoverAiJobs,
  submitAiJob,
} from '../service'
import type {AiJobRecord} from '../../repositories/ai-jobs'

const USER_ID = '019d0000-0000-7000-8000-000000000001'
const JOB_ID = '019d0000-0000-7000-8000-000000000002'
const NOW = new Date('2026-09-20T00:00:00.000Z')

const createJob = (overrides: Partial<AiJobRecord> = {}): AiJobRecord => ({
  attemptCount: 0,
  capability: 'text',
  completedAt: null,
  createdAt: NOW,
  dispatchLeaseUntil: null,
  errorCode: null,
  errorMessage: null,
  estimatedCredits: null,
  id: JOB_ID,
  idempotencyKey: 'idempotency-key-1',
  intermediateCleanupAt: null,
  lastRunnerError: null,
  lastSubmissionError: null,
  modelId: 'gpt-5.6-luna',
  progress: 0,
  providerAcceptedAt: null,
  quotaUnits: 1,
  recoveryAttempts: 0,
  recoveryDeadlineAt: null,
  request: {messages: [{content: '안녕', role: 'user'}], parameters: {}},
  requestHash: 'request-hash',
  result: null,
  runnerJobId: null,
  settledCredits: null,
  startedAt: null,
  status: 'queued',
  submissionState: 'not_submitted',
  timeoutAt: new Date('2026-09-20T00:02:00.000Z'),
  updatedAt: NOW,
  usagePeriodEnd: '2026-10-01',
  usagePeriodStart: '2026-09-01',
  userId: USER_ID,
  ...overrides,
})

const resetRepository = () => {
  for (const mock of Object.values(repositoryMocks)) {
    mock.mockReset()
  }
  repositoryMocks.getUsagePeriodStart.mockReturnValue('2026-09-01')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  resetRepository()
  vi.clearAllMocks()
  repositoryMocks.listRecoveryPendingAiJobs.mockResolvedValue([])
  repositoryMocks.listAiJobsWithExpiredIntermediateArtifacts.mockResolvedValue([])
  repositoryMocks.listExpiredAiArtifacts.mockResolvedValue([])
  repositoryMocks.clearAiJobArtifactPendingArchive.mockResolvedValue(undefined)
  repositoryMocks.claimAiJobArtifactDeletion.mockResolvedValue(null)
  repositoryMocks.claimAiJobArtifactArchiveCleanup.mockResolvedValue(null)
  repositoryMocks.clearAiJobArtifactArchiveCleanup.mockResolvedValue(undefined)
  repositoryMocks.markAiJobArtifactDeleted.mockResolvedValue(undefined)
  repositoryMocks.markAiJobIntermediateCleanupCompleted.mockResolvedValue(true)
  repositoryMocks.prepareAiJobArtifactArchive.mockResolvedValue(null)
  repositoryMocks.purgeExpiredAiCostLedger.mockResolvedValue(0)
  repositoryMocks.recordAiJobArtifactDeleteFailure.mockResolvedValue(undefined)
  repositoryMocks.clearAiJobArtifactSourceObjectKey.mockResolvedValue(undefined)
  repositoryMocks.findAiJobArtifactForUser.mockResolvedValue(null)
  repositoryMocks.saveAiJobArtifact.mockResolvedValue(null)
  repositoryMocks.releaseAiJobConcurrency.mockResolvedValue(undefined)
  repositoryMocks.reserveAiJobConcurrency.mockResolvedValue(true)
  openAiMocks.submitLunaTextJob.mockResolvedValue({responseId: 'response-1'})
  openAiMocks.retrieveLunaTextJob.mockResolvedValue({status: 'queued'})
  openAiMocks.cancelLunaTextJob.mockResolvedValue(undefined)
  runnerMocks.createAiRunnerClient.mockReturnValue({
    cancel: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn(),
    submit: vi.fn(),
  })
  artifactMocks.createAiArtifactDownloadUrl.mockResolvedValue({
    expiresAt: new Date('2026-09-20T00:10:00.000Z'),
    url: 'https://private.example.test/signed',
  })
  artifactMocks.listAiArtifactIntermediateObjectKeys.mockResolvedValue([])
  artifactMocks.copyAiArtifactObject.mockResolvedValue(undefined)
  artifactMocks.deleteAiArtifactObject.mockResolvedValue(undefined)
})

afterEach(() => vi.useRealTimers())

describe('AI service', () => {
  it('finalizes a successful local-runner artifact and preserves runner metrics', async () => {
    const running = createJob({
      capability: 'text_to_speech',
      modelId: 'supertonic-int8',
      runnerJobId: 'runner-job-1',
      status: 'running',
    })
    const succeeded = createJob({
      ...running,
      completedAt: NOW,
      progress: 100,
      result: {
        artifact: {contentType: 'audio/wav', objectKey: `ai/jobs/${JOB_ID}/temporary/result.wav`},
        metrics: {inferenceMs: 120},
      },
      status: 'succeeded',
    })
    const runner = runnerMocks.createAiRunnerClient()
    runner.getStatus.mockResolvedValue({
      jobId: 'runner-job-1',
      metrics: {inferenceMs: 120, queueMs: 8},
      progress: 100,
      result: {
        artifact: {contentType: 'audio/wav', objectKey: `ai/jobs/${JOB_ID}/temporary/result.wav`},
      },
      status: 'succeeded',
    })
    repositoryMocks.findAiJobForUser.mockResolvedValue(running)
    repositoryMocks.finalizeAiJob.mockResolvedValue(succeeded)

    const result = await getAiJobStatus(JOB_ID, USER_ID)

    expect(result).toEqual(succeeded)
    expect(repositoryMocks.finalizeAiJob).toHaveBeenCalledWith(
      JOB_ID,
      expect.objectContaining({
        result: {
          artifact: {
            contentType: 'audio/wav',
            objectKey: `ai/jobs/${JOB_ID}/temporary/result.wav`,
          },
          metrics: {inferenceMs: 120, queueMs: 8},
        },
        status: 'succeeded',
      }),
    )
  })

  it('rejects a runner result that tries to bypass the temporary artifact namespace', async () => {
    const running = createJob({
      capability: 'text_to_speech',
      modelId: 'supertonic-int8',
      runnerJobId: 'runner-job-archive',
      status: 'running',
    })
    const failed = createJob({
      ...running,
      completedAt: NOW,
      errorCode: 'invalid-runner-result',
      errorMessage: 'AI runner returned an invalid result contract',
      status: 'failed',
    })
    const runner = runnerMocks.createAiRunnerClient()
    runner.getStatus.mockResolvedValue({
      jobId: 'runner-job-archive',
      progress: 100,
      result: {
        artifact: {
          contentType: 'audio/wav',
          objectKey: `ai/jobs/${JOB_ID}/archive/result.wav`,
        },
      },
      status: 'succeeded',
    })
    repositoryMocks.findAiJobForUser.mockResolvedValue(running)
    repositoryMocks.finalizeAiJob.mockResolvedValue(failed)

    await expect(getAiJobStatus(JOB_ID, USER_ID)).resolves.toEqual(failed)
    expect(repositoryMocks.finalizeAiJob).toHaveBeenCalledWith(
      JOB_ID,
      expect.objectContaining({errorCode: 'invalid-runner-result', status: 'failed'}),
    )
  })

  it('retries released queued jobs and expires stale provider jobs from shared state', async () => {
    const queued = createJob({
      capability: 'speech_to_text',
      modelId: 'whisper-tiny',
      request: {audioBase64: 'UklGRg=='},
    })
    const claimed = createJob({...queued, dispatchLeaseUntil: queued.timeoutAt})
    const running = createJob({
      ...queued,
      attemptCount: 1,
      dispatchLeaseUntil: queued.timeoutAt,
      runnerJobId: 'runner-job-2',
      startedAt: NOW,
      status: 'running',
    })
    const expired = createJob({
      capability: 'sound',
      id: '019d0000-0000-7000-8000-000000000003',
      modelId: 'stable-audio-3-optimized',
      runnerJobId: 'runner-job-expired',
      status: 'running',
    })
    const runner = runnerMocks.createAiRunnerClient()
    runner.submit.mockResolvedValue({jobId: 'runner-job-2'})
    repositoryMocks.listDispatchableAiJobs.mockResolvedValue([queued])
    repositoryMocks.claimAiJobForDispatch.mockResolvedValue(claimed)
    repositoryMocks.markAiJobRunning.mockResolvedValue(running)
    repositoryMocks.listExpiredAiJobs.mockResolvedValue([expired])
    repositoryMocks.expireAiJob.mockResolvedValue({...expired, status: 'timed_out'})
    repositoryMocks.listRunningAiJobs.mockResolvedValue([])

    await expect(recoverAiJobs()).resolves.toEqual({
      artifactDeletionFailures: 0,
      artifactsDeleted: 0,
      checked: 2,
      costRecordsPurged: 0,
      dispatched: 1,
      expired: 1,
      intermediateDeletionFailures: 0,
      intermediateObjectsDeleted: 0,
      recoveryPending: 0,
    })
    expect(runner.submit).toHaveBeenCalledOnce()
    expect(runner.cancel).toHaveBeenCalledWith('runner-job-expired')
    expect(repositoryMocks.expireAiJob).toHaveBeenCalledWith(expired.id)
  })

  it('reconciles running provider jobs even when no client polls them', async () => {
    const running = createJob({
      runnerJobId: 'openai:response-3',
      status: 'running',
    })
    const succeeded = createJob({
      ...running,
      completedAt: NOW,
      progress: 100,
      result: {text: '완료된 응답'},
      status: 'succeeded',
    })
    openAiMocks.retrieveLunaTextJob.mockResolvedValue({
      output_text: '완료된 응답',
      status: 'completed',
    })
    repositoryMocks.listRunningAiJobs.mockResolvedValue([running])
    repositoryMocks.listDispatchableAiJobs.mockResolvedValue([])
    repositoryMocks.listExpiredAiJobs.mockResolvedValue([])
    repositoryMocks.finalizeAiJob.mockResolvedValue(succeeded)

    await expect(recoverAiJobs()).resolves.toEqual({
      artifactDeletionFailures: 0,
      artifactsDeleted: 0,
      checked: 1,
      costRecordsPurged: 0,
      dispatched: 0,
      expired: 0,
      intermediateDeletionFailures: 0,
      intermediateObjectsDeleted: 0,
      recoveryPending: 0,
    })
    expect(openAiMocks.retrieveLunaTextJob).toHaveBeenCalledWith('response-3')
    expect(repositoryMocks.finalizeAiJob).toHaveBeenCalledWith(
      JOB_ID,
      expect.objectContaining({result: {text: '완료된 응답'}, status: 'succeeded'}),
    )
  })

  it.each(['', ' \n\t ', 'x'.repeat(12_001)])(
    'rejects OpenAI text outside the durable result contract',
    async (outputText) => {
      const running = createJob({
        runnerJobId: 'openai:response-too-large',
        status: 'running',
      })
      const failed = createJob({
        ...running,
        errorCode: 'invalid-openai-result',
        status: 'failed',
      })
      openAiMocks.retrieveLunaTextJob.mockResolvedValue({
        output_text: outputText,
        status: 'completed',
      })
      repositoryMocks.findAiJobForUser.mockResolvedValue(running)
      repositoryMocks.finalizeAiJob.mockResolvedValue(failed)

      await expect(getAiJobStatus(JOB_ID, USER_ID)).resolves.toEqual(failed)
      expect(repositoryMocks.finalizeAiJob).toHaveBeenCalledWith(
        JOB_ID,
        expect.objectContaining({
          errorCode: 'invalid-openai-result',
          status: 'failed',
        }),
      )
    },
  )

  it('expires a running job when the provider poll crosses its timeout', async () => {
    const running = createJob({
      capability: 'text_to_speech',
      modelId: 'supertonic-int8',
      runnerJobId: 'runner-job-late',
      status: 'running',
      timeoutAt: new Date(NOW.getTime() + 1),
    })
    const timedOut = createJob({...running, errorCode: 'timed_out', status: 'timed_out'})
    const runner = runnerMocks.createAiRunnerClient()
    runner.getStatus.mockImplementation(async () => {
      vi.setSystemTime(new Date(NOW.getTime() + 2))
      return {
        jobId: 'runner-job-late',
        progress: 100,
        result: null,
        status: 'succeeded',
      }
    })
    repositoryMocks.listRunningAiJobs.mockResolvedValue([running])
    repositoryMocks.listDispatchableAiJobs.mockResolvedValue([])
    repositoryMocks.listExpiredAiJobs.mockResolvedValue([])
    repositoryMocks.expireAiJob.mockResolvedValue(timedOut)

    await expect(recoverAiJobs()).resolves.toMatchObject({checked: 1})
    expect(repositoryMocks.expireAiJob).toHaveBeenCalledWith(JOB_ID)
    expect(repositoryMocks.finalizeAiJob).not.toHaveBeenCalled()
    expect(runner.cancel).toHaveBeenCalledWith('runner-job-late')
  })

  it('expires instead of accepting a result when finalization crosses its timeout', async () => {
    const running = createJob({
      runnerJobId: 'openai:response-finalization-late',
      status: 'running',
      timeoutAt: new Date(NOW.getTime() + 1),
    })
    const timedOut = createJob({...running, errorCode: 'timed_out', status: 'timed_out'})
    openAiMocks.retrieveLunaTextJob.mockResolvedValue({
      output_text: '늦은 응답',
      status: 'completed',
    })
    repositoryMocks.listRunningAiJobs.mockResolvedValue([running])
    repositoryMocks.listDispatchableAiJobs.mockResolvedValue([])
    repositoryMocks.listExpiredAiJobs.mockResolvedValue([])
    repositoryMocks.finalizeAiJob.mockImplementation(async (_jobId, input) => {
      expect(input.acceptBeforeTimeout).toBe(true)
      vi.setSystemTime(new Date(NOW.getTime() + 2))
      return running
    })
    repositoryMocks.expireAiJob.mockResolvedValue(timedOut)

    await expect(recoverAiJobs()).resolves.toMatchObject({checked: 1})
    expect(repositoryMocks.expireAiJob).toHaveBeenCalledWith(JOB_ID)
    expect(openAiMocks.cancelLunaTextJob).toHaveBeenCalledWith('response-finalization-late')
  })
})
