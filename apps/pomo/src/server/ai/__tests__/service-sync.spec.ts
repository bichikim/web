/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {type AiJobSynchronizerDependencies, createAiJobSynchronizer} from '../service-sync'
import {createJob, NOW} from './fixtures/job'

const createDependencies = () =>
  ({
    clock: () => NOW,
    dispatchJob: vi.fn(),
    expireAiProviderJob: vi.fn(),
    getRunnerStatus: vi.fn(),
    persistAcceptedProvider: vi.fn(),
    repository: {
      finalizeAiJob: vi.fn(),
      requeueAiJobForRunnerRecovery: vi.fn(),
      updateAiJobProgress: vi.fn(),
    },
    retrieveLunaTextJob: vi.fn(),
  }) satisfies AiJobSynchronizerDependencies

it.each(['before', 'at'] as const)(
  'should use the injected clock %s the provider deadline',
  async (boundary) => {
    const dependencies = createDependencies()
    const job = createJob({runnerJobId: 'openai:response-1', status: 'running'})
    const now = new Date(job.timeoutAt.getTime() - (boundary === 'before' ? 1 : 0))
    const expired = createJob({status: 'timed_out'})
    dependencies.retrieveLunaTextJob.mockResolvedValue({output_text: 'done', status: 'completed'})
    dependencies.repository.finalizeAiJob.mockResolvedValue(createJob({status: 'succeeded'}))
    dependencies.expireAiProviderJob.mockResolvedValue(expired)
    await createAiJobSynchronizer({...dependencies, clock: () => now}).synchronizeOpenAiJob(job)
    if (boundary === 'at') {
      expect(dependencies.expireAiProviderJob).toHaveBeenCalledWith(job)
      expect(dependencies.repository.finalizeAiJob).not.toHaveBeenCalled()
    } else {
      expect(dependencies.repository.finalizeAiJob).toHaveBeenCalledWith(
        job.id,
        expect.objectContaining({status: 'succeeded'}),
      )
      expect(dependencies.expireAiProviderJob).not.toHaveBeenCalled()
    }
  },
)

it('should recheck the injected clock after an awaited provider retrieval', async () => {
  const dependencies = createDependencies()
  const job = createJob({runnerJobId: 'openai:response-1', status: 'running'})
  let now = NOW
  dependencies.retrieveLunaTextJob.mockImplementation(async () => {
    now = job.timeoutAt
    return {output_text: 'late', status: 'completed'}
  })
  dependencies.expireAiProviderJob.mockResolvedValue(createJob({status: 'timed_out'}))
  await createAiJobSynchronizer({...dependencies, clock: () => now}).synchronizeRunningJob(job)
  expect(dependencies.expireAiProviderJob).toHaveBeenCalledWith(job)
  expect(dependencies.repository.finalizeAiJob).not.toHaveBeenCalled()
})
