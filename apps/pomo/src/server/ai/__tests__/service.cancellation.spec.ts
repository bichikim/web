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
  it('keeps provider cost unknown when cancelling an ambiguous queued submission', async () => {
    const queuedUnknown = createJob({submissionState: 'unknown'})
    const cancelled = createJob({status: 'cancelled', submissionState: 'unknown'})
    repositoryMocks.findAiJobForUser.mockResolvedValue(queuedUnknown)
    repositoryMocks.cancelAiJob.mockResolvedValue(cancelled)

    await expect(cancelAiJobForUser(JOB_ID, USER_ID)).resolves.toEqual(cancelled)
    expect(repositoryMocks.cancelAiJob).toHaveBeenCalledWith(JOB_ID, {
      providerCostUnknown: true,
    })
  })
})
