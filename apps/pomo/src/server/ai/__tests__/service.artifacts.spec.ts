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
  listAiArtifactTemporaryObjectKeys: vi.fn(),
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
  artifactMocks.listAiArtifactTemporaryObjectKeys.mockResolvedValue([])
  artifactMocks.copyAiArtifactObject.mockResolvedValue(undefined)
  artifactMocks.deleteAiArtifactObject.mockResolvedValue(undefined)
})

afterEach(() => vi.useRealTimers())

describe('AI service', () => {
  it('copies a temporary artifact into the archive namespace before saving it', async () => {
    const temporary = {
      contentType: 'audio/wav',
      createdAt: NOW,
      deleteAttempts: 0,
      deletedAt: null,
      durationMs: 1000,
      expiresAt: new Date('2026-09-27T00:00:00.000Z'),
      id: '019d0000-0000-7000-8000-000000000003',
      jobId: JOB_ID,
      lastDeleteError: null,
      lifecycle: 'temporary' as const,
      objectKey: `ai/jobs/${JOB_ID}/temporary/result.wav`,
      retentionClass: 'unsaved_result' as const,
      savedAt: null,
      sizeBytes: 100,
      sourceObjectKey: null,
      userId: USER_ID,
    }
    const saved = {
      ...temporary,
      expiresAt: null,
      lifecycle: 'saved' as const,
      objectKey: `ai/jobs/${JOB_ID}/archive/result.wav`,
      retentionClass: 'saved_result' as const,
      savedAt: NOW,
      sourceObjectKey: temporary.objectKey,
    }
    repositoryMocks.findAiJobArtifactForUser.mockResolvedValue(temporary)
    repositoryMocks.prepareAiJobArtifactArchive.mockResolvedValue({
      ...temporary,
      sourceObjectKey: saved.objectKey,
    })
    repositoryMocks.saveAiJobArtifact.mockResolvedValue(saved)

    const {saveAiJobArtifactForUser} = await import('../service')
    await expect(saveAiJobArtifactForUser(JOB_ID, USER_ID)).resolves.toEqual(saved)
    expect(artifactMocks.copyAiArtifactObject).toHaveBeenCalledWith(
      temporary.objectKey,
      saved.objectKey,
    )
    expect(repositoryMocks.prepareAiJobArtifactArchive).toHaveBeenCalledWith(
      temporary.id,
      USER_ID,
      saved.objectKey,
    )
    expect(artifactMocks.deleteAiArtifactObject).toHaveBeenCalledWith(temporary.objectKey)
    expect(repositoryMocks.clearAiJobArtifactSourceObjectKey).toHaveBeenCalledWith(
      temporary.id,
      temporary.objectKey,
    )
  })

  it('blocks an artifact immediately while retaining a failed deletion for cron retry', async () => {
    const saved = {
      contentType: 'audio/wav',
      createdAt: NOW,
      deleteAttempts: 0,
      deletedAt: null,
      durationMs: 1000,
      expiresAt: null,
      id: '019d0000-0000-7000-8000-000000000003',
      jobId: JOB_ID,
      lastDeleteError: null,
      lifecycle: 'saved' as const,
      objectKey: `ai/jobs/${JOB_ID}/archive/result.wav`,
      retentionClass: 'saved_result' as const,
      savedAt: NOW,
      sizeBytes: 100,
      sourceObjectKey: null,
      userId: USER_ID,
    }
    const pending = {
      ...saved,
      deleteAttempts: 1,
      lastDeleteError: 'R2 unavailable',
      lifecycle: 'deletion_pending' as const,
    }
    repositoryMocks.findAiJobArtifactForUser.mockResolvedValue(saved)
    repositoryMocks.claimAiJobArtifactDeletion.mockResolvedValue(pending)
    repositoryMocks.recordAiJobArtifactDeleteFailure.mockResolvedValue(pending)
    artifactMocks.deleteAiArtifactObject.mockRejectedValue(new Error('R2 unavailable'))

    const {deleteAiJobArtifactForUser} = await import('../service')
    await expect(deleteAiJobArtifactForUser(JOB_ID, USER_ID)).resolves.toEqual(pending)
    expect(repositoryMocks.claimAiJobArtifactDeletion).toHaveBeenCalledWith(saved.id, {
      expectedLifecycle: saved.lifecycle,
      expectedObjectKey: saved.objectKey,
      expectedSourceObjectKey: saved.sourceObjectKey,
    })
    expect(repositoryMocks.markAiJobArtifactDeleted).not.toHaveBeenCalled()
    expect(repositoryMocks.recordAiJobArtifactDeleteFailure).toHaveBeenCalledWith(
      saved.id,
      'R2 unavailable',
      {
        expectedLifecycle: pending.lifecycle,
        expectedObjectKey: saved.objectKey,
        expectedSourceObjectKey: saved.sourceObjectKey,
      },
    )
  })

  it('retries the deletion claim when a concurrent save wins the first state race', async () => {
    const temporary = {
      contentType: 'audio/wav',
      createdAt: NOW,
      deleteAttempts: 0,
      deletedAt: null,
      durationMs: 1000,
      expiresAt: new Date('2026-09-27T00:00:00.000Z'),
      id: '019d0000-0000-7000-8000-000000000003',
      jobId: JOB_ID,
      lastDeleteError: null,
      lifecycle: 'temporary' as const,
      objectKey: `ai/jobs/${JOB_ID}/temporary/result.wav`,
      pendingObjectKey: null,
      retentionClass: 'unsaved_result' as const,
      savedAt: null,
      sizeBytes: 100,
      sourceObjectKey: null,
      userId: USER_ID,
    }
    const saved = {
      ...temporary,
      expiresAt: null,
      lifecycle: 'saved' as const,
      objectKey: `ai/jobs/${JOB_ID}/archive/result.wav`,
      retentionClass: 'saved_result' as const,
      savedAt: NOW,
    }
    const pending = {...saved, lifecycle: 'deletion_pending' as const}
    repositoryMocks.findAiJobArtifactForUser
      .mockResolvedValueOnce(temporary)
      .mockResolvedValueOnce(saved)
    repositoryMocks.claimAiJobArtifactDeletion
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(pending)
    repositoryMocks.markAiJobArtifactDeleted.mockResolvedValue({
      ...pending,
      lifecycle: 'deleted',
    })

    const {deleteAiJobArtifactForUser} = await import('../service')
    await expect(deleteAiJobArtifactForUser(JOB_ID, USER_ID)).resolves.toMatchObject({
      lifecycle: 'deleted',
    })
    expect(repositoryMocks.claimAiJobArtifactDeletion).toHaveBeenCalledTimes(2)
    expect(artifactMocks.deleteAiArtifactObject).toHaveBeenCalledWith(saved.objectKey)
  })

  it('cleans runner intermediate objects from a completed job after the retention window', async () => {
    const intermediateObjectKey = `ai/intermediate/${JOB_ID}/raw.wav`
    repositoryMocks.listRunningAiJobs.mockResolvedValue([])
    repositoryMocks.listRecoveryPendingAiJobs.mockResolvedValue([])
    repositoryMocks.listDispatchableAiJobs.mockResolvedValue([])
    repositoryMocks.listExpiredAiJobs.mockResolvedValue([])
    repositoryMocks.listAiJobsWithExpiredIntermediateArtifacts.mockResolvedValue([
      {id: JOB_ID, status: 'succeeded'},
    ])
    artifactMocks.listAiArtifactIntermediateObjectKeys.mockResolvedValue([intermediateObjectKey])

    await expect(recoverAiJobs()).resolves.toMatchObject({
      intermediateDeletionFailures: 0,
      intermediateObjectsDeleted: 1,
    })
    expect(artifactMocks.listAiArtifactIntermediateObjectKeys).toHaveBeenCalledWith(
      `ai/intermediate/${JOB_ID}`,
    )
    expect(artifactMocks.deleteAiArtifactObject).toHaveBeenCalledWith(intermediateObjectKey)
    expect(repositoryMocks.markAiJobIntermediateCleanupCompleted).toHaveBeenCalledWith(
      JOB_ID,
      expect.any(Date),
    )
  })

  it('should delete only a stale archive copy while an interrupted save still owns the temporary object', async () => {
    const archiving = {
      archivePendingAt: new Date(NOW.getTime() - 86_400_001),
      contentType: 'audio/wav',
      createdAt: NOW,
      deleteAttempts: 0,
      deletedAt: null,
      durationMs: 1000,
      expiresAt: new Date('2026-09-27T00:00:00.000Z'),
      id: '019d0000-0000-7000-8000-000000000003',
      jobId: JOB_ID,
      lastDeleteError: null,
      lifecycle: 'archiving' as const,
      objectKey: `ai/jobs/${JOB_ID}/temporary/result.wav`,
      pendingObjectKey: `ai/jobs/${JOB_ID}/archive/result.wav`,
      retentionClass: 'unsaved_result' as const,
      savedAt: null,
      sizeBytes: 100,
      sourceObjectKey: null,
      userId: USER_ID,
    }
    repositoryMocks.listRunningAiJobs.mockResolvedValue([])
    repositoryMocks.listRecoveryPendingAiJobs.mockResolvedValue([])
    repositoryMocks.listDispatchableAiJobs.mockResolvedValue([])
    repositoryMocks.listExpiredAiJobs.mockResolvedValue([])
    repositoryMocks.listExpiredAiArtifacts.mockResolvedValue([archiving])
    const cleanupPending = {
      ...archiving,
      lifecycle: 'archive_cleanup_pending' as const,
    }
    repositoryMocks.claimAiJobArtifactArchiveCleanup.mockResolvedValue(cleanupPending)
    repositoryMocks.clearAiJobArtifactArchiveCleanup.mockResolvedValue({
      ...cleanupPending,
      archivePendingAt: null,
      lifecycle: 'temporary',
      pendingObjectKey: null,
    })

    await recoverAiJobs()

    expect(artifactMocks.deleteAiArtifactObject).toHaveBeenCalledWith(archiving.pendingObjectKey)
    expect(artifactMocks.deleteAiArtifactObject).not.toHaveBeenCalledWith(archiving.objectKey)
    expect(repositoryMocks.claimAiJobArtifactArchiveCleanup).toHaveBeenCalledWith(archiving.id, {
      expectedLifecycle: archiving.lifecycle,
      expectedObjectKey: archiving.objectKey,
      expectedPendingObjectKey: archiving.pendingObjectKey,
      expectedSourceObjectKey: archiving.sourceObjectKey,
    })
    expect(repositoryMocks.clearAiJobArtifactArchiveCleanup).toHaveBeenCalledWith(
      archiving.id,
      archiving.pendingObjectKey,
    )
  })

  it('does not delete a stale archive when another save already won the state race', async () => {
    const archiving = {
      archivePendingAt: new Date(NOW.getTime() - 86_400_001),
      contentType: 'audio/wav',
      createdAt: NOW,
      deleteAttempts: 0,
      deletedAt: null,
      durationMs: 1000,
      expiresAt: new Date('2026-09-27T00:00:00.000Z'),
      id: '019d0000-0000-7000-8000-000000000003',
      jobId: JOB_ID,
      lastDeleteError: null,
      lifecycle: 'archiving' as const,
      objectKey: `ai/jobs/${JOB_ID}/temporary/result.wav`,
      pendingObjectKey: `ai/jobs/${JOB_ID}/archive/result.wav`,
      retentionClass: 'unsaved_result' as const,
      savedAt: null,
      sizeBytes: 100,
      sourceObjectKey: null,
      userId: USER_ID,
    }
    repositoryMocks.listRunningAiJobs.mockResolvedValue([])
    repositoryMocks.listRecoveryPendingAiJobs.mockResolvedValue([])
    repositoryMocks.listDispatchableAiJobs.mockResolvedValue([])
    repositoryMocks.listExpiredAiJobs.mockResolvedValue([])
    repositoryMocks.listExpiredAiArtifacts.mockResolvedValue([archiving])
    repositoryMocks.claimAiJobArtifactArchiveCleanup.mockResolvedValue(null)

    await recoverAiJobs()

    expect(artifactMocks.deleteAiArtifactObject).not.toHaveBeenCalled()
    expect(repositoryMocks.clearAiJobArtifactArchiveCleanup).not.toHaveBeenCalled()
  })
})

it.each(['cancelled', 'failed', 'timed_out'] as const)(
  'should retry orphan result deletion for a %s job before marking cleanup complete',
  async (status) => {
    const objectKey = `ai/jobs/${JOB_ID}/temporary/result.wav`
    repositoryMocks.listRunningAiJobs.mockResolvedValue([])
    repositoryMocks.listRecoveryPendingAiJobs.mockResolvedValue([])
    repositoryMocks.listDispatchableAiJobs.mockResolvedValue([])
    repositoryMocks.listExpiredAiJobs.mockResolvedValue([])
    repositoryMocks.listAiJobsWithExpiredIntermediateArtifacts.mockResolvedValue([
      {id: JOB_ID, status},
    ])
    artifactMocks.listAiArtifactTemporaryObjectKeys.mockResolvedValue([objectKey])
    artifactMocks.deleteAiArtifactObject.mockRejectedValueOnce(new Error('R2 unavailable'))

    await expect(recoverAiJobs()).resolves.toMatchObject({intermediateDeletionFailures: 1})
    expect(repositoryMocks.markAiJobIntermediateCleanupCompleted).not.toHaveBeenCalled()
    await expect(recoverAiJobs()).resolves.toMatchObject({
      intermediateDeletionFailures: 0,
      intermediateObjectsDeleted: 1,
    })
    expect(artifactMocks.deleteAiArtifactObject).toHaveBeenCalledWith(objectKey)
    expect(repositoryMocks.markAiJobIntermediateCleanupCompleted).toHaveBeenCalledWith(
      JOB_ID,
      expect.any(Date),
    )
  },
)

it('should preserve successful temporary results during intermediate cleanup', async () => {
  repositoryMocks.listRunningAiJobs.mockResolvedValue([])
  repositoryMocks.listRecoveryPendingAiJobs.mockResolvedValue([])
  repositoryMocks.listDispatchableAiJobs.mockResolvedValue([])
  repositoryMocks.listExpiredAiJobs.mockResolvedValue([])
  repositoryMocks.listAiJobsWithExpiredIntermediateArtifacts.mockResolvedValue([
    {id: JOB_ID, status: 'succeeded'},
  ])
  await recoverAiJobs()
  expect(artifactMocks.listAiArtifactTemporaryObjectKeys).not.toHaveBeenCalled()
  expect(artifactMocks.deleteAiArtifactObject).not.toHaveBeenCalled()
  expect(repositoryMocks.markAiJobIntermediateCleanupCompleted).toHaveBeenCalled()
})

it('should delete a shared current and pending object key only once', async () => {
  const objectKey = `ai/jobs/${JOB_ID}/archive/result.wav`
  const saved = {
    archivePendingAt: null,
    contentType: 'audio/wav',
    createdAt: NOW,
    deleteAttempts: 0,
    deletedAt: null,
    durationMs: 1000,
    expiresAt: null,
    id: '019d0000-0000-7000-8000-000000000003',
    jobId: JOB_ID,
    lastDeleteError: null,
    lifecycle: 'saved' as const,
    objectKey,
    pendingObjectKey: null,
    retentionClass: 'saved_result' as const,
    savedAt: NOW,
    sizeBytes: 100,
    sourceObjectKey: null,
    userId: USER_ID,
  }
  const pending = {...saved, lifecycle: 'deletion_pending', pendingObjectKey: objectKey}
  repositoryMocks.findAiJobArtifactForUser.mockResolvedValue(saved)
  repositoryMocks.claimAiJobArtifactDeletion.mockResolvedValue(pending)
  repositoryMocks.markAiJobArtifactDeleted.mockResolvedValue({...saved, lifecycle: 'deleted'})
  const {deleteAiJobArtifactForUser} = await import('../service')
  await expect(deleteAiJobArtifactForUser(JOB_ID, USER_ID)).resolves.toMatchObject({
    lifecycle: 'deleted',
  })
  expect(artifactMocks.deleteAiArtifactObject).toHaveBeenCalledExactlyOnceWith(objectKey)
})
