/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {AiRunnerError} from '../runner-client'
import {dispatchJob} from '../service-dispatch'
import {createJob, NOW} from './fixtures/job'

const repository = vi.hoisted(() => ({
  cancelAiJob: vi.fn(),
  claimAiJobForDispatch: vi.fn(),
  expireAiJob: vi.fn(),
  finalizeAiJob: vi.fn(),
  findAiJob: vi.fn(),
  markAiJobRecoveryPending: vi.fn(),
  markAiJobRunning: vi.fn(),
  recordAiJobDispatchError: vi.fn(),
  releaseAiJobConcurrency: vi.fn(),
  reserveAiJobConcurrency: vi.fn(),
}))
const provider = vi.hoisted(() => ({submit: vi.fn()}))
const runner = vi.hoisted(() => ({cancel: vi.fn(), submit: vi.fn()}))
const configuration = vi.hoisted(() => ({env: {}}))

vi.mock('src/env', () => configuration)
vi.mock('src/server/repositories/ai-jobs', () => repository)
vi.mock('../openai-text', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../openai-text')>()),
  submitLunaTextJob: provider.submit,
}))
vi.mock('../runner-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../runner-client')>()),
  createAiRunnerClient: vi.fn(() => runner),
}))

const lanes = [
  {
    fallback: 'Failed to persist OpenAI response ID',
    name: 'OpenAI acceptance',
    phase: 'accepted',
    runner: 'openai',
  },
  {
    fallback: 'Failed to persist runner job ID',
    name: 'runner acceptance',
    phase: 'accepted',
    runner: 'local-runner',
  },
  {
    fallback: 'AI job dispatch failed',
    name: 'runner retry',
    phase: 'retry',
    runner: 'local-runner',
  },
  {
    fallback: 'AI job dispatch failed',
    name: 'runner terminal failure',
    phase: 'terminal',
    runner: 'local-runner',
  },
] as const
const cases = lanes.flatMap((lane) =>
  (['detail', 'empty', 'plain'] as const)
    .filter((cause) => lane.phase !== 'retry' || cause !== 'plain')
    .map((cause) => ({...lane, cause})),
)

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  repository.reserveAiJobConcurrency.mockResolvedValue(true)
  repository.releaseAiJobConcurrency.mockResolvedValue(undefined)
})
afterEach(() => vi.useRealTimers())

it.each(cases)(
  'should preserve the diagnostic and lease policy for $name / $cause',
  async (lane) => {
    const job = createJob(
      lane.runner === 'openai'
        ? {}
        : {
            capability: 'speech_to_text',
            modelId: 'whisper-tiny',
            request: {audioBase64: 'UklGRg=='},
          },
    )
    const claimed = createJob({...job, dispatchLeaseUntil: job.timeoutAt})
    const runnerJobId = lane.runner === 'openai' ? 'openai:response-1' : 'runner-1'
    const recovered = createJob({...claimed, runnerJobId, status: 'recovery_pending'})
    const failed = createJob({...claimed, status: 'failed'})
    let messageReads = 0
    const message = lane.cause === 'empty' ? '' : 'provider detail'
    const error = Object.defineProperty(
      lane.cause === 'plain'
        ? {}
        : lane.phase === 'retry'
          ? new AiRunnerError('request-failed', message, {retryable: true})
          : new Error(message),
      'message',
      {
        get: () => {
          messageReads += 1
          if (lane.cause === 'plain') {
            throw new Error('A plain-object message must not be read')
          }
          return message
        },
      },
    )
    const expected = lane.cause === 'plain' ? lane.fallback : message
    repository.claimAiJobForDispatch.mockResolvedValue(claimed)
    repository.markAiJobRecoveryPending.mockResolvedValue(recovered)
    repository.recordAiJobDispatchError.mockResolvedValue(claimed)
    repository.finalizeAiJob.mockResolvedValue(failed)
    provider.submit.mockResolvedValue({responseId: 'response-1'})
    if (lane.phase === 'accepted') {
      runner.submit.mockResolvedValue({jobId: 'runner-1'})
      repository.markAiJobRunning.mockRejectedValue(error)
    } else {
      runner.submit.mockRejectedValue(error)
    }

    const result = await dispatchJob(job)

    expect(messageReads).toBe(lane.cause === 'plain' ? 0 : 1)
    const phase = lane.phase
    switch (phase) {
      case 'accepted':
        expect(result).toEqual({job: recovered, kind: 'recovery-pending'})
        expect(repository.markAiJobRecoveryPending).toHaveBeenCalledWith(job.id, {
          dispatchLeaseUntil: job.timeoutAt,
          errorMessage: expected,
          recoveryDeadlineAt: job.timeoutAt,
          runnerJobId,
        })
        expect(repository.releaseAiJobConcurrency).not.toHaveBeenCalled()
        expect(runner.cancel).not.toHaveBeenCalled()
        break
      case 'retry':
        expect(result).toEqual({job: claimed, kind: 'queued'})
        expect(repository.recordAiJobDispatchError).toHaveBeenCalledWith(job.id, expected)
        expect(repository.releaseAiJobConcurrency.mock.invocationCallOrder[0]).toBeLessThan(
          repository.recordAiJobDispatchError.mock.invocationCallOrder[0],
        )
        break
      case 'terminal':
        expect(result).toEqual({job: failed, kind: 'terminal'})
        expect(repository.finalizeAiJob).toHaveBeenCalledWith(job.id, {
          errorCode: 'dispatch-failed',
          errorMessage: expected,
          status: 'failed',
        })
        expect(repository.releaseAiJobConcurrency.mock.invocationCallOrder[0]).toBeLessThan(
          repository.finalizeAiJob.mock.invocationCallOrder[0],
        )
        break
      default:
        phase satisfies never
    }
  },
)
