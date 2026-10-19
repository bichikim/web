/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {AiJobRecord} from 'src/server/repositories/ai-jobs'
import {type AiRecoveryServiceDependencies, createAiRecoveryService} from '../service-recovery'

const now = new Date('2026-09-20T00:00:00.000Z')
afterEach(() => vi.restoreAllMocks())
const createJob = (index: number): AiJobRecord => ({
  attemptCount: 0,
  capability: 'text',
  completedAt: null,
  createdAt: now,
  dispatchLeaseUntil: null,
  errorCode: null,
  errorMessage: null,
  estimatedCredits: null,
  id: `job-${index}`,
  idempotencyKey: `request-${index}`,
  intermediateCleanupAt: null,
  lastRunnerError: null,
  lastSubmissionError: null,
  modelId: 'gpt-5.6-luna',
  progress: 0,
  providerAcceptedAt: null,
  quotaUnits: 1,
  recoveryAttempts: 0,
  recoveryDeadlineAt: null,
  request: {messages: [{content: 'Hello', role: 'user'}], parameters: {}},
  requestHash: 'hash',
  result: null,
  runnerJobId: null,
  settledCredits: null,
  startedAt: null,
  status: 'queued',
  submissionState: 'not_submitted',
  timeoutAt: now,
  updatedAt: now,
  usagePeriodEnd: null,
  usagePeriodStart: '2026-09-01',
  userId: 'user',
})

const createDependencies = () => ({
  cleanupExpiredAiArtifacts: vi.fn(async () => ({deleted: 0, failures: 0})),
  cleanupExpiredAiIntermediateObjects: vi.fn(async () => ({deleted: 0, failures: 0})),
  clock: () => now,
  dispatchJob: vi.fn<AiRecoveryServiceDependencies['dispatchJob']>(),
  expireProviderJob: vi.fn<AiRecoveryServiceDependencies['expireProviderJob']>(),
  listDispatchableAiJobs: vi.fn(async (): Promise<readonly AiJobRecord[]> => []),
  listExpiredAiJobs: vi.fn(async (): Promise<readonly AiJobRecord[]> => []),
  listRecoveryPendingAiJobs: vi.fn(async (): Promise<readonly AiJobRecord[]> => []),
  listRunningAiJobs: vi.fn(async (): Promise<readonly AiJobRecord[]> => []),
  purgeExpiredAiCostLedger: vi.fn(async () => 0),
  synchronizeRecoveryPendingJob:
    vi.fn<AiRecoveryServiceDependencies['synchronizeRecoveryPendingJob']>(),
  synchronizeRunningJob: vi.fn<AiRecoveryServiceDependencies['synchronizeRunningJob']>(),
})

describe('createAiRecoveryService', () => {
  it('should wait for each eight-job batch and continue after failures through the final partial batch', async () => {
    const jobs = Object.freeze(Array.from({length: 17}, (_, index) => createJob(index)))
    const gates = jobs.map(() => Promise.withResolvers<void>())
    const firstEntered = Promise.withResolvers<void>()
    const firstSettled = Promise.withResolvers<void>()
    const secondEntered = Promise.withResolvers<void>()
    const finalEntered = Promise.withResolvers<void>()
    const started: string[] = []
    let settled = 0
    const dependencies = createDependencies()
    dependencies.listDispatchableAiJobs.mockResolvedValue(jobs)
    dependencies.dispatchJob.mockImplementation(async (job) => {
      const index = jobs.indexOf(job)
      started.push(job.id)
      if (started.length === 8) {
        firstEntered.resolve()
      }
      if (started.length === 16) {
        secondEntered.resolve()
      }
      if (started.length === 17) {
        finalEntered.resolve()
      }
      try {
        await gates[index].promise
        return {job, kind: 'dispatched'}
      } finally {
        settled += 1
        if (settled === 7) {
          firstSettled.resolve()
        }
      }
    })
    const error = new Error('provider unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const recovery = createAiRecoveryService(dependencies).recoverAiJobs()

    await firstEntered.promise
    expect(started).toEqual(jobs.slice(0, 8).map((job) => job.id))
    gates.slice(0, 7).forEach((gate) => gate.resolve())
    await firstSettled.promise
    expect(started).toHaveLength(8)
    gates[7].reject(error)
    await secondEntered.promise
    expect(started).toEqual(jobs.slice(0, 16).map((job) => job.id))
    expect(dependencies.listExpiredAiJobs).not.toHaveBeenCalled()
    gates[9].reject(error)
    gates.slice(8, 16).forEach((gate, index) => {
      if (index !== 1) {
        gate.resolve()
      }
    })
    await finalEntered.promise
    expect(started).toEqual(jobs.map((job) => job.id))
    gates[16].resolve()

    await expect(recovery).resolves.toMatchObject({checked: 17, dispatched: 15})
    expect(dependencies.dispatchJob).toHaveBeenCalledTimes(17)
    expect(consoleError.mock.calls).toEqual([
      ['Failed to process an AI recovery item', {jobId: jobs[7].id}, error],
      ['Failed to process an AI recovery item', {jobId: jobs[9].id}, error],
    ])
    expect(jobs.map((job) => job.id)).toEqual(
      Array.from({length: 17}, (_, index) => `job-${index}`),
    )
  })

  it('should skip empty job lists while still performing artifact and cost cleanup', async () => {
    const dependencies = createDependencies()
    await expect(createAiRecoveryService(dependencies).recoverAiJobs()).resolves.toEqual({
      artifactDeletionFailures: 0,
      artifactsDeleted: 0,
      checked: 0,
      costRecordsPurged: 0,
      dispatched: 0,
      expired: 0,
      intermediateDeletionFailures: 0,
      intermediateObjectsDeleted: 0,
      recoveryPending: 0,
    })
    expect(dependencies.dispatchJob).not.toHaveBeenCalled()
    expect(dependencies.synchronizeRunningJob).not.toHaveBeenCalled()
    expect(dependencies.synchronizeRecoveryPendingJob).not.toHaveBeenCalled()
    expect(dependencies.expireProviderJob).not.toHaveBeenCalled()
    expect(dependencies.cleanupExpiredAiArtifacts).toHaveBeenCalledOnce()
    expect(dependencies.cleanupExpiredAiIntermediateObjects).toHaveBeenCalledExactlyOnceWith(now)
    expect(dependencies.purgeExpiredAiCostLedger).toHaveBeenCalledExactlyOnceWith(now)
  })
})
