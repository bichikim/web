/** @vitest-environment node */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import * as aiJobs from 'src/server/repositories/ai-jobs'
import {LunaTextSubmissionError, submitLunaTextJob} from '../openai-text'
import {cancelAiProviderJob} from '../provider-jobs'
import {type AiRunnerClient, AiRunnerError, createAiRunnerClient} from '../runner-client'
import {dispatchJob} from '../service-dispatch'
import {AiProviderAcceptancePersistenceError} from '../service-shared'
import {createJob, NOW} from './fixtures/job'

vi.mock('src/env', () => ({env: {}}))
vi.mock('src/server/repositories/ai-jobs', () => ({
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
vi.mock('../openai-text', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../openai-text')>()),
  submitLunaTextJob: vi.fn(),
}))
vi.mock('../runner-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../runner-client')>()),
  createAiRunnerClient: vi.fn(),
}))
vi.mock('../provider-jobs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../provider-jobs')>()),
  cancelAiProviderJob: vi.fn(),
}))

const repository = vi.mocked(aiJobs)
const cancel = vi.mocked(cancelAiProviderJob)
const openai = vi.mocked(submitLunaTextJob)
const runner = {
  cancel: vi.fn<AiRunnerClient['cancel']>(),
  getStatus: vi.fn<AiRunnerClient['getStatus']>(),
  submit: vi.fn<AiRunnerClient['submit']>(),
}
const handle = {jobId: 'runner-1', responseId: 'response-1'}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Unexpected network request')))
  vi.mocked(createAiRunnerClient).mockReturnValue(runner)
  repository.reserveAiJobConcurrency.mockResolvedValue(true)
})

afterEach(() => {
  expect(fetch).not.toHaveBeenCalled()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe.each([
  {
    claimError: 'OpenAI accepted the response but the job claim was lost',
    fallback: 'Failed to persist OpenAI response ID',
    name: 'openai',
    providerId: 'openai:response-1',
  },
  {
    claimError: 'AI runner accepted the job but the durable claim was lost',
    fallback: 'Failed to persist runner job ID',
    name: 'local-runner',
    providerId: 'runner-1',
  },
] as const)('$name accepted provider persistence', (provider) => {
  const submit = provider.name === 'openai' ? openai : runner.submit
  let job: aiJobs.AiJobRecord
  let claimed: aiJobs.AiJobRecord
  let running: aiJobs.AiJobRecord
  let recovered: aiJobs.AiJobRecord

  beforeEach(() => {
    job = createJob(
      provider.name === 'openai'
        ? {}
        : {
            capability: 'speech_to_text',
            modelId: 'whisper-tiny',
            request: {audioBase64: 'UklGRg=='},
          },
    )
    claimed = createJob({...job, dispatchLeaseUntil: job.timeoutAt, submissionState: 'unknown'})
    running = createJob({...claimed, runnerJobId: provider.providerId, status: 'running'})
    recovered = createJob({...running, status: 'recovery_pending'})
    repository.claimAiJobForDispatch.mockResolvedValue(claimed)
    repository.markAiJobRunning.mockResolvedValue(running)
    repository.markAiJobRecoveryPending.mockResolvedValue(recovered)
    submit.mockResolvedValue(handle)
    cancel.mockResolvedValue(undefined)
  })

  const expectAcceptance = () => {
    expect(submit).toHaveBeenCalledTimes(1)
    expect(repository.markAiJobRunning).toHaveBeenCalledTimes(1)
    expect(provider.name === 'openai' ? runner.submit : openai).not.toHaveBeenCalled()
    expect(repository.releaseAiJobConcurrency).not.toHaveBeenCalled()
    expect(repository.finalizeAiJob).not.toHaveBeenCalled()
    expect(repository.recordAiJobDispatchError).not.toHaveBeenCalled()
    expect(repository.cancelAiJob).not.toHaveBeenCalled()
  }

  it('should preserve the running record identity and provider submission arguments', async () => {
    const result = await dispatchJob(job)

    expect(result.kind).toBe('dispatched')
    expect(result.job).toBe(running)
    if (provider.name === 'openai') {
      expect(openai).toHaveBeenCalledWith(claimed.id, claimed.request)
    } else {
      expect(runner.submit).toHaveBeenCalledWith({
        capability: 'speech_to_text',
        input: claimed.request,
        jobId: claimed.id,
        modelId: claimed.modelId,
        protocolVersion: 1,
      })
    }
    expect(repository.markAiJobRunning).toHaveBeenCalledExactlyOnceWith(
      claimed.id,
      provider.providerId,
      claimed.timeoutAt,
    )
    expect(repository.reserveAiJobConcurrency).toHaveBeenCalledExactlyOnceWith(
      claimed,
      provider.name,
    )
    expect(repository.markAiJobRecoveryPending).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
    expectAcceptance()
  })

  it('should wait for provider acceptance before marking running', async () => {
    const pending = Promise.withResolvers<typeof handle>()
    const entered = Promise.withResolvers<void>()
    submit.mockImplementation(() => {
      entered.resolve()
      return pending.promise
    })
    const settled = vi.fn()
    const dispatch = dispatchJob(job).then(settled)
    await entered.promise

    expect(repository.markAiJobRunning).not.toHaveBeenCalled()
    expect(repository.markAiJobRecoveryPending).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
    expect(settled).not.toHaveBeenCalled()
    pending.resolve(handle)
    await dispatch
    expect(settled).toHaveBeenCalledWith({job: running, kind: 'dispatched'})
    expectAcceptance()
  })

  it('should wait for mark running without starting recovery', async () => {
    const pending = Promise.withResolvers<aiJobs.AiJobRecord | null>()
    const entered = Promise.withResolvers<void>()
    repository.markAiJobRunning.mockImplementation(() => {
      entered.resolve()
      return pending.promise
    })
    const settled = vi.fn()
    const dispatch = dispatchJob(job).then(settled)
    await entered.promise

    expect(repository.markAiJobRecoveryPending).not.toHaveBeenCalled()
    expect(cancel).not.toHaveBeenCalled()
    expect(settled).not.toHaveBeenCalled()
    pending.resolve(running)
    await dispatch
    expect(settled).toHaveBeenCalledWith({job: running, kind: 'dispatched'})
    expectAcceptance()
  })

  it('should wait for recovery persistence before deciding whether to cancel', async () => {
    const pending = Promise.withResolvers<aiJobs.AiJobRecord | null>()
    const entered = Promise.withResolvers<void>()
    const terminal = createJob({...running, status: 'cancelled'})
    repository.markAiJobRunning.mockResolvedValue(null)
    repository.findAiJob.mockResolvedValue(terminal)
    repository.markAiJobRecoveryPending.mockImplementation(() => {
      entered.resolve()
      return pending.promise
    })
    const settled = vi.fn()
    const dispatch = dispatchJob(job).then(settled)
    await entered.promise

    expect(cancel).not.toHaveBeenCalled()
    expect(settled).not.toHaveBeenCalled()
    pending.resolve(null)
    await dispatch
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(settled).toHaveBeenCalledWith({job: terminal, kind: 'dispatched'})
    expectAcceptance()
  })

  it('should wait for cancellation after the recovery record is persisted', async () => {
    const pending = Promise.withResolvers<void>()
    const entered = Promise.withResolvers<void>()
    const terminal = createJob({...running, status: 'failed'})
    repository.markAiJobRunning.mockResolvedValue(null)
    repository.markAiJobRecoveryPending.mockResolvedValue(null)
    repository.findAiJob.mockResolvedValue(terminal)
    cancel.mockImplementation(() => {
      entered.resolve()
      return pending.promise
    })
    const settled = vi.fn()
    const dispatch = dispatchJob(job).then(settled)
    await entered.promise

    expect(repository.markAiJobRecoveryPending).toHaveBeenCalledTimes(1)
    expect(settled).not.toHaveBeenCalled()
    pending.resolve()
    await dispatch
    expect(settled).toHaveBeenCalledWith({job: terminal, kind: 'dispatched'})
    expectAcceptance()
  })

  it.each(['detail', 'empty', 'plain', 'synchronous'] as const)(
    'should retain the lease and preserve the %s mark rejection diagnostic',
    async (cause) => {
      const message = cause === 'empty' ? '' : 'mark detail'
      const readMessage = vi.fn(() => message)
      const error = Object.defineProperty(cause === 'plain' ? {} : new Error(), 'message', {
        get: readMessage,
      })
      if (cause === 'synchronous') {
        repository.markAiJobRunning.mockImplementation(() => {
          throw error
        })
      } else {
        repository.markAiJobRunning.mockRejectedValue(error)
      }

      const result = await dispatchJob(job)

      expect(result.job).toBe(recovered)
      expect(result.kind).toBe('recovery-pending')
      expect(readMessage).toHaveBeenCalledTimes(cause === 'plain' ? 0 : 1)
      expect(repository.markAiJobRecoveryPending).toHaveBeenCalledExactlyOnceWith(claimed.id, {
        dispatchLeaseUntil: claimed.dispatchLeaseUntil,
        errorMessage: cause === 'plain' ? provider.fallback : message,
        recoveryDeadlineAt: claimed.timeoutAt,
        runnerJobId: provider.providerId,
      })
      expect(cancel).not.toHaveBeenCalled()
      expectAcceptance()
    },
  )

  it('should persist the provider-specific claim loss diagnostic when mark returns null', async () => {
    repository.markAiJobRunning.mockResolvedValue(null)

    const result = await dispatchJob(job)

    expect(result.job).toBe(recovered)
    expect(result.kind).toBe('recovery-pending')
    expect(repository.markAiJobRecoveryPending).toHaveBeenCalledExactlyOnceWith(claimed.id, {
      dispatchLeaseUntil: claimed.dispatchLeaseUntil,
      errorMessage: provider.claimError,
      recoveryDeadlineAt: claimed.timeoutAt,
      runnerJobId: provider.providerId,
    })
    expect(cancel).not.toHaveBeenCalled()
    expectAcceptance()
  })

  it.each(['running', 'recovery_pending'] as const)(
    'should retain a matching nonterminal %s recovery record without cancellation',
    async (status) => {
      const persisted = createJob({...running, status})
      repository.markAiJobRunning.mockResolvedValue(null)
      repository.markAiJobRecoveryPending.mockResolvedValue(null)
      repository.findAiJob.mockResolvedValue(persisted)

      const result = await dispatchJob(job)

      expect(result.job).toBe(persisted)
      expect(result.kind).toBe(status === 'recovery_pending' ? 'recovery-pending' : 'dispatched')
      expect(repository.findAiJob).toHaveBeenCalledExactlyOnceWith(claimed.id)
      expect(cancel).not.toHaveBeenCalled()
      expectAcceptance()
    },
  )

  it.each(['cancelled', 'failed', 'succeeded', 'timed_out', 'mismatching-id'] as const)(
    'should cancel the accepted provider after persisting %s recovery',
    async (state) => {
      const persisted =
        state === 'mismatching-id'
          ? createJob({...running, runnerJobId: 'other-provider'})
          : createJob({...running, status: state})
      repository.markAiJobRunning.mockResolvedValue(null)
      repository.markAiJobRecoveryPending.mockResolvedValue(null)
      repository.findAiJob.mockResolvedValue(persisted)

      const result = await dispatchJob(job)

      expect(result.job).toBe(persisted)
      expect(result.kind).toBe('dispatched')
      expect(repository.markAiJobRecoveryPending).toHaveBeenCalledTimes(1)
      expect(repository.findAiJob).toHaveBeenCalledExactlyOnceWith(claimed.id)
      expect(cancel).toHaveBeenCalledExactlyOnceWith({...claimed, runnerJobId: provider.providerId})
      expect(repository.markAiJobRecoveryPending.mock.invocationCallOrder[0]).toBeLessThan(
        repository.findAiJob.mock.invocationCallOrder[0],
      )
      expect(repository.findAiJob.mock.invocationCallOrder[0]).toBeLessThan(
        cancel.mock.invocationCallOrder[0],
      )
      expectAcceptance()
    },
  )

  it('should return persisted recovery even when cancellation rejects', async () => {
    const terminal = createJob({...running, status: 'cancelled'})
    const failure = new Error('cancel failed')
    repository.markAiJobRunning.mockResolvedValue(null)
    repository.markAiJobRecoveryPending.mockResolvedValue(null)
    repository.findAiJob.mockResolvedValue(terminal)
    cancel.mockRejectedValue(failure)

    const result = await dispatchJob(job)

    expect(result.job).toBe(terminal)
    expect(result.kind).toBe('dispatched')
    expect(cancel).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'Failed to cancel an AI provider accepted after the dispatch claim was lost',
      {jobId: claimed.id},
      failure,
    )
    expectAcceptance()
  })

  it.each(['null', 'rejection'] as const)(
    'should not repeat recovery or release the lease when recovery rejects after mark %s',
    async (mark) => {
      if (mark === 'null') {
        repository.markAiJobRunning.mockResolvedValue(null)
      } else {
        repository.markAiJobRunning.mockRejectedValue(new Error('mark failed'))
      }
      const failure = new Error('recovery failed')
      repository.markAiJobRecoveryPending.mockRejectedValue(failure)

      const result = await dispatchJob(job)

      expect(result.job).toBe(claimed)
      expect(result.kind).toBe('recovery-pending')
      expect(repository.markAiJobRecoveryPending).toHaveBeenCalledTimes(1)
      expect(repository.findAiJob).not.toHaveBeenCalled()
      expect(cancel).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledExactlyOnceWith(
        'Failed to persist accepted AI provider job',
        {jobId: claimed.id},
        expect.any(AiProviderAcceptancePersistenceError),
      )
      expect(vi.mocked(console.error).mock.calls[0]?.[2]).toHaveProperty('cause', failure)
      expectAcceptance()
    },
  )

  it.each(['missing', 'queued'] as const)(
    'should keep recovery pending when acceptance cannot be persisted and the latest job is %s',
    async (latest) => {
      repository.markAiJobRunning.mockResolvedValue(null)
      repository.markAiJobRecoveryPending.mockResolvedValue(null)
      repository.findAiJob.mockResolvedValue(latest === 'missing' ? null : claimed)

      const result = await dispatchJob(job)

      expect(result.job).toBe(claimed)
      expect(result.kind).toBe('recovery-pending')
      expect(repository.markAiJobRecoveryPending).toHaveBeenCalledTimes(1)
      expect(repository.findAiJob).toHaveBeenCalledExactlyOnceWith(claimed.id)
      expect(cancel).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledExactlyOnceWith(
        'Failed to persist accepted AI provider job',
        {jobId: claimed.id},
        expect.any(AiProviderAcceptancePersistenceError),
      )
      expectAcceptance()
    },
  )

  it.each(['retryable', 'terminal'] as const)(
    'should preserve %s submit failure classification outside accepted-provider recovery',
    async (classification) => {
      const retryable = classification === 'retryable'
      const failure =
        provider.name === 'openai'
          ? new LunaTextSubmissionError(retryable, new Error('submit failed'))
          : new AiRunnerError('request-failed', 'submit failed', {retryable})
      const failed = createJob({...claimed, status: 'failed'})
      submit.mockRejectedValue(failure)
      repository.recordAiJobDispatchError.mockResolvedValue(job)
      repository.finalizeAiJob.mockResolvedValue(failed)

      const result = await dispatchJob(job)

      expect(submit).toHaveBeenCalledTimes(1)
      expect(repository.markAiJobRunning).not.toHaveBeenCalled()
      expect(cancel).not.toHaveBeenCalled()
      if (provider.name === 'openai' && retryable) {
        expect(result.job).toBe(recovered)
        expect(result.kind).toBe('recovery-pending')
        expect(repository.markAiJobRecoveryPending).toHaveBeenCalledExactlyOnceWith(claimed.id, {
          dispatchLeaseUntil: claimed.dispatchLeaseUntil,
          errorMessage: 'submit failed',
          recoveryDeadlineAt: claimed.timeoutAt,
          runnerJobId: undefined,
        })
        expect(repository.releaseAiJobConcurrency).not.toHaveBeenCalled()
        expect(repository.finalizeAiJob).not.toHaveBeenCalled()
        expect(repository.recordAiJobDispatchError).not.toHaveBeenCalled()
      } else {
        expect(repository.markAiJobRecoveryPending).not.toHaveBeenCalled()
        expect(repository.releaseAiJobConcurrency).toHaveBeenCalledExactlyOnceWith(claimed.id)
        if (retryable) {
          expect(result).toEqual({job, kind: 'queued'})
          expect(repository.recordAiJobDispatchError).toHaveBeenCalledExactlyOnceWith(
            claimed.id,
            'submit failed',
          )
          expect(repository.finalizeAiJob).not.toHaveBeenCalled()
          expect(repository.releaseAiJobConcurrency.mock.invocationCallOrder[0]).toBeLessThan(
            repository.recordAiJobDispatchError.mock.invocationCallOrder[0],
          )
        } else {
          expect(result.job).toBe(failed)
          expect(result.kind).toBe('terminal')
          expect(repository.finalizeAiJob).toHaveBeenCalledExactlyOnceWith(claimed.id, {
            errorCode:
              provider.name === 'openai' ? 'openai-submission-rejected' : 'runner-request-failed',
            errorMessage: 'submit failed',
            status: 'failed',
          })
          expect(repository.recordAiJobDispatchError).not.toHaveBeenCalled()
          expect(repository.releaseAiJobConcurrency.mock.invocationCallOrder[0]).toBeLessThan(
            repository.finalizeAiJob.mock.invocationCallOrder[0],
          )
        }
      }
    },
  )

  it.each(['success', 'null', 'rejection'] as const)(
    'should preserve ordered and repeated getter reads on mark %s',
    async (outcome) => {
      const trace: string[] = []
      let idReads = 0
      const readId = () => {
        idReads += 1
        trace.push(`provider-id-${idReads}`)
        return idReads === 1 ? 'first' : 'second'
      }
      const accepted = {
        get jobId() {
          return readId()
        },
        get responseId() {
          return readId()
        },
      }
      const failure = Object.defineProperty(new Error(), 'message', {
        get: () => {
          trace.push('error.message')
          return 'mark failed'
        },
      })
      Object.defineProperties(claimed, {
        id: {
          get: () => {
            trace.push('job.id')
            return job.id
          },
        },
        timeoutAt: {
          get: () => {
            trace.push('job.timeoutAt')
            return job.timeoutAt
          },
        },
      })
      submit.mockImplementation(async () => {
        trace.length = 0
        return accepted
      })
      repository.markAiJobRunning.mockImplementation(() => {
        trace.push('mark')
        return outcome === 'rejection'
          ? Promise.reject(failure)
          : Promise.resolve(outcome === 'null' ? null : running)
      })
      repository.markAiJobRecoveryPending.mockImplementation(async () => {
        trace.push('recovery')
        return createJob({
          ...recovered,
          runnerJobId: provider.name === 'openai' ? 'openai:second' : 'second',
        })
      })

      const result = await dispatchJob(job)

      const markTrace = ['job.id', 'provider-id-1', 'job.timeoutAt', 'mark']
      expect(trace).toEqual(
        outcome === 'success'
          ? markTrace
          : [
              ...markTrace,
              'provider-id-2',
              ...(outcome === 'rejection' ? ['error.message'] : []),
              'job.id',
              'job.timeoutAt',
              'recovery',
            ],
      )
      expect(repository.markAiJobRunning).toHaveBeenCalledExactlyOnceWith(
        job.id,
        provider.name === 'openai' ? 'openai:first' : 'first',
        job.timeoutAt,
      )
      if (outcome === 'success') {
        expect(result.job).toBe(running)
        expect(result.kind).toBe('dispatched')
        expect(repository.markAiJobRecoveryPending).not.toHaveBeenCalled()
      } else {
        expect(result.kind).toBe('recovery-pending')
        expect(repository.markAiJobRecoveryPending).toHaveBeenCalledExactlyOnceWith(job.id, {
          dispatchLeaseUntil: job.timeoutAt,
          errorMessage: outcome === 'rejection' ? 'mark failed' : provider.claimError,
          recoveryDeadlineAt: job.timeoutAt,
          runnerJobId: provider.name === 'openai' ? 'openai:second' : 'second',
        })
      }
      expect(cancel).not.toHaveBeenCalled()
      expectAcceptance()
    },
  )
})
