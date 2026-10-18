/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import {type AiJobServiceDependencies, createAiJobService} from '../create-ai-job-service'
import * as catalog from '../model-catalog'
import {createJob, NOW, USER_ID} from './fixtures/job'

afterEach(() => {
  vi.restoreAllMocks()
})

const createDependencies = () =>
  ({
    cancelAiProviderJob: vi.fn(),
    clock: () => NOW,
    config: {
      POMO_AI_CREDIT_PROFILE_JSON: undefined,
      POMO_AI_QUEUE_LIMIT: 100,
      POMO_AI_RUNNER_TIMEOUT_MS: 120000,
      POMO_AI_SUBSCRIPTION_PRODUCT_CODE: 'pomo-ai-service',
    },
    dispatchJob: vi.fn(async (job) => ({job, kind: 'queued' as const})),
    expireAiProviderJob: vi.fn(),
    repository: {
      cancelAiJob: vi.fn(),
      claimAiJobArtifactArchiveCleanup: vi.fn(),
      claimAiJobArtifactDeletion: vi.fn(),
      clearAiJobArtifactArchiveCleanup: vi.fn(),
      clearAiJobArtifactPendingArchive: vi.fn(),
      clearAiJobArtifactSourceObjectKey: vi.fn(),
      createAiJob: vi.fn(),
      findAiJobArtifactForUser: vi.fn(),
      findAiJobForUser: vi.fn(),
      getUsagePeriodStart: vi.fn(),
      hasActiveAiEntitlement: vi.fn(),
      listAiJobsWithExpiredIntermediateArtifacts: vi.fn(),
      listDispatchableAiJobs: vi.fn(),
      listExpiredAiArtifacts: vi.fn(),
      listExpiredAiJobs: vi.fn(),
      listRecoveryPendingAiJobs: vi.fn(),
      listRunningAiJobs: vi.fn(),
      markAiJobArtifactDeleted: vi.fn(),
      markAiJobIntermediateCleanupCompleted: vi.fn(),
      prepareAiJobArtifactArchive: vi.fn(),
      purgeExpiredAiCostLedger: vi.fn(),
      recordAiJobArtifactDeleteFailure: vi.fn(),
      saveAiJobArtifact: vi.fn(),
    },
    storage: {
      copyAiArtifactObject: vi.fn(),
      createAiArtifactDownloadUrl: vi.fn(),
      deleteAiArtifactObject: vi.fn(),
      listAiArtifactIntermediateObjectKeys: vi.fn(),
      listAiArtifactTemporaryObjectKeys: vi.fn(),
    },
    synchronizer: {
      finalizeAiProviderJob: vi.fn(),
      synchronizeOpenAiJob: vi.fn(),
      synchronizeRecoveryPendingJob: vi.fn(),
      synchronizeRunnerJob: vi.fn(),
      synchronizeRunningJob: vi.fn(),
    },
  }) satisfies AiJobServiceDependencies
it.each([
  {expectedCredits: 4097, parameters: undefined},
  {expectedCredits: 4097, parameters: {}},
  {expectedCredits: 129, parameters: {maximumTokens: 128}},
])(
  'should reserve configured credits for text input with $expectedCredits credits',
  async ({parameters, expectedCredits}) => {
    const dependencies = createDependencies()
    const queued = createJob()
    dependencies.repository.createAiJob.mockResolvedValue({job: queued, kind: 'created'})
    const service = createAiJobService({
      ...dependencies,
      config: {
        ...dependencies.config,
        POMO_AI_CREDIT_PROFILE_JSON: JSON.stringify({textInputToken: 1, textOutputToken: 1}),
        POMO_AI_MONTHLY_CREDIT_CAP: 10000,
      },
    })
    await expect(
      service.submitAiJob(USER_ID, {
        capability: 'text',
        idempotencyKey: 'configured-profile-default-cap',
        input: {messages: [{content: '안녕', role: 'user'}], parameters},
      }),
    ).resolves.toMatchObject({kind: 'accepted'})
    expect(dependencies.repository.createAiJob).toHaveBeenCalledWith(
      expect.objectContaining({estimatedCredits: expectedCredits}),
      expect.objectContaining({monthlyCreditCap: 10000}),
    )
  },
)

it('should isolate configuration and clocks between service instances', async () => {
  const first = createDependencies()
  const second = createDependencies()
  const later = new Date(NOW.getTime() + 60000)
  first.repository.createAiJob.mockResolvedValue({kind: 'quota-exceeded'})
  second.repository.createAiJob.mockResolvedValue({kind: 'quota-exceeded'})
  const request = {
    capability: 'text' as const,
    idempotencyKey: 'isolated-service',
    input: {messages: [{content: 'hello', role: 'user'}]},
  }
  await createAiJobService(first).submitAiJob(USER_ID, request)
  await createAiJobService({
    ...second,
    clock: () => later,
    config: {...second.config, POMO_AI_RUNNER_TIMEOUT_MS: 30000},
  }).submitAiJob(USER_ID, request)
  expect(first.repository.createAiJob).toHaveBeenCalledWith(
    expect.objectContaining({timeoutAt: new Date(NOW.getTime() + 120000)}),
    expect.objectContaining({now: NOW}),
  )
  expect(second.repository.createAiJob).toHaveBeenCalledWith(
    expect.objectContaining({timeoutAt: new Date(later.getTime() + 30000)}),
    expect.objectContaining({now: later}),
  )
  expect(first.dispatchJob).not.toHaveBeenCalled()
  expect(second.dispatchJob).not.toHaveBeenCalled()
})

it.each([
  {
    capability: 'image',
    expected: 'image',
    input: {height: 256, idea: 'rain', seed: 1, steps: 1, width: 256},
    modelId: 'bonsai-binary',
  },
  {
    capability: 'sound',
    expected: 'sound',
    input: {durationSeconds: 1, prompt: 'rain'},
    modelId: 'stable-audio-3-optimized',
  },
  {
    capability: 'speech-to-text',
    expected: 'speech_to_text',
    input: {audioBase64: 'UklGRg=='},
    modelId: 'whisper-tiny',
  },
  {
    capability: 'text',
    expected: 'text',
    input: {messages: [{content: 'hello', role: 'user'}]},
    modelId: 'gpt-5.6-luna',
  },
  {
    capability: 'text-to-speech',
    expected: 'text_to_speech',
    input: {text: 'hello', voiceId: 'F1'},
    modelId: 'supertonic-full',
  },
] as const)('should persist the $expected capability before dispatch', async (request) => {
  vi.spyOn(catalog, 'isAiModelProductionEnabled').mockReturnValue(true)
  const dependencies = createDependencies()
  const queued = createJob({capability: request.expected, modelId: request.modelId})
  dependencies.repository.createAiJob.mockResolvedValue({job: queued, kind: 'created'})

  await expect(
    createAiJobService(dependencies).submitAiJob(USER_ID, {
      capability: request.capability,
      idempotencyKey: 'capability-submission',
      input: request.input,
      modelId: request.modelId,
    }),
  ).resolves.toEqual({created: true, job: queued, kind: 'accepted'})

  expect(dependencies.repository.createAiJob).toHaveBeenCalledOnce()
  expect(dependencies.repository.createAiJob).toHaveBeenCalledWith(
    expect.objectContaining({
      capability: request.expected,
      modelId: request.modelId,
      userId: USER_ID,
    }),
    expect.objectContaining({now: NOW}),
  )
  expect(dependencies.dispatchJob).toHaveBeenCalledWith(queued)
  expect(dependencies.repository.createAiJob.mock.invocationCallOrder[0]).toBeLessThan(
    dependencies.dispatchJob.mock.invocationCallOrder[0],
  )
})
