import {expect, it, vi} from 'vitest'

import type {FeedDialogueJob} from '../feed-dialogue-schema'
import {prepareFeedGeneration} from '../generation-preparation'

const JOB: FeedDialogueJob = {
  createdAt: '2026-08-14T00:00:00.000Z',
  errorMessage: null,
  feedConnectionId: 'feed-1',
  feedItemId: 'item-1',
  id: 'job-1',
  itemTitle: '새 피드',
  modelId: 'int8',
  publishedAt: '2026-08-14T00:00:00.000Z',
  script: '새 소식',
  sourceTitle: '테스트 피드',
  sourceUrl: 'https://example.com/item-1',
  status: 'queued',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'M1',
}
const createRepository = () => ({startJob: vi.fn(async () => true)})

it('should return the latest voice after preparing a stable model', async () => {
  const repository = createRepository()
  const resolveGenerationSettings = vi
    .fn()
    .mockResolvedValueOnce({modelId: 'int8', voiceId: 'M1'})
    .mockResolvedValueOnce({modelId: 'int8', voiceId: 'Yuna'})

  const result = await prepareFeedGeneration({
    allowModelDownload: false,
    isModelDownloaded: vi.fn(async () => true),
    job: JOB,
    now: () => '2026-08-14T00:01:00.000Z',
    prepareModel: vi.fn(async () => true),
    repository,
    resolveGenerationSettings,
  })

  expect(repository.startJob).toHaveBeenCalledWith({
    ...JOB,
    status: 'generating',
    updatedAt: '2026-08-14T00:01:00.000Z',
  })
  expect(result).toEqual({job: {...JOB, voiceId: 'Yuna'}, status: 'ready'})
})

it('should stop when the queued job was already interrupted', async () => {
  const repository = {startJob: vi.fn(async () => false)}
  const resolveGenerationSettings = vi.fn()

  const result = await prepareFeedGeneration({
    allowModelDownload: false,
    isModelDownloaded: vi.fn(async () => true),
    job: JOB,
    now: () => '2026-08-14T00:01:00.000Z',
    prepareModel: vi.fn(async () => true),
    repository,
    resolveGenerationSettings,
  })

  expect(result).toEqual({status: 'job-not-queued'})
  expect(resolveGenerationSettings).not.toHaveBeenCalled()
})

it('should prepare a newly selected model before returning its latest voice', async () => {
  const prepareModel = vi.fn(async () => true)
  const resolveGenerationSettings = vi
    .fn()
    .mockResolvedValueOnce({modelId: 'int8', voiceId: 'M1'})
    .mockResolvedValueOnce({modelId: 'full', voiceId: 'Yuna'})
    .mockResolvedValueOnce({modelId: 'full', voiceId: 'M2'})

  const result = await prepareFeedGeneration({
    allowModelDownload: true,
    isModelDownloaded: vi.fn(async () => false),
    job: JOB,
    now: () => '2026-08-14T00:01:00.000Z',
    prepareModel,
    repository: createRepository(),
    resolveGenerationSettings,
  })

  expect(prepareModel).toHaveBeenNthCalledWith(1, 'int8')
  expect(prepareModel).toHaveBeenNthCalledWith(2, 'full')
  expect(result).toEqual({job: {...JOB, modelId: 'full', voiceId: 'M2'}, status: 'ready'})
})

it('should require approval before preparing an unavailable model', async () => {
  const prepareModel = vi.fn(async () => true)

  const result = await prepareFeedGeneration({
    allowModelDownload: false,
    isModelDownloaded: vi.fn(async () => false),
    job: JOB,
    now: () => '2026-08-14T00:01:00.000Z',
    prepareModel,
    repository: createRepository(),
    resolveGenerationSettings: vi.fn(async () => ({
      modelId: 'full' as const,
      voiceId: 'Yuna' as const,
    })),
  })

  expect(result).toEqual({
    job: {...JOB, modelId: 'full', voiceId: 'Yuna'},
    status: 'model-download-required',
  })
  expect(prepareModel).not.toHaveBeenCalled()
})

it('should return the current job when model preparation fails', async () => {
  const result = await prepareFeedGeneration({
    allowModelDownload: false,
    isModelDownloaded: vi.fn(async () => true),
    job: JOB,
    now: () => '2026-08-14T00:01:00.000Z',
    prepareModel: vi.fn(async () => false),
    repository: createRepository(),
    resolveGenerationSettings: vi.fn(async () => ({
      modelId: 'full' as const,
      voiceId: 'Yuna' as const,
    })),
  })

  expect(result).toEqual({
    job: {...JOB, modelId: 'full', voiceId: 'Yuna'},
    status: 'model-preparation-failed',
  })
})

it('should stop when the connection is missing before or after preparation', async () => {
  const initiallyMissing = await prepareFeedGeneration({
    allowModelDownload: false,
    isModelDownloaded: vi.fn(async () => true),
    job: JOB,
    now: () => '2026-08-14T00:01:00.000Z',
    prepareModel: vi.fn(async () => true),
    repository: createRepository(),
    resolveGenerationSettings: vi.fn(async () => null),
  })
  const removedAfterPreparation = await prepareFeedGeneration({
    allowModelDownload: false,
    isModelDownloaded: vi.fn(async () => true),
    job: JOB,
    now: () => '2026-08-14T00:01:00.000Z',
    prepareModel: vi.fn(async () => true),
    repository: createRepository(),
    resolveGenerationSettings: vi
      .fn()
      .mockResolvedValueOnce({modelId: 'int8', voiceId: 'M1'})
      .mockResolvedValueOnce(null),
  })

  expect(initiallyMissing).toEqual({status: 'connection-missing'})
  expect(removedAfterPreparation).toEqual({status: 'connection-missing'})
})
