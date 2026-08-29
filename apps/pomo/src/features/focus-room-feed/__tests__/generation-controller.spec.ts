import {beforeEach, expect, it, vi} from 'vitest'

import type {SupertonicClient} from '../../supertonic'
import type {PFeedState} from '../feed-controller'
import type {FeedDialogueJob, FeedItemRecord} from '../feed-dialogue-schema'
import {
  createFeedGenerationController,
  type FeedGenerationDialogueRepository,
  type FeedGenerationRepository,
  type FeedGenerationRuntime,
} from '../generation-controller'
import type {FeedConnection} from '../schema'

const createConnection = (): FeedConnection => ({
  createdAt: '2026-08-14T00:00:00.000Z',
  id: 'feed-1',
  updatedAt: '2026-08-14T00:00:00.000Z',
  url: 'https://example.com/feed.xml',
  version: 1,
  voiceId: 'Yuna',
})

const createItem = (feedItemId = 'item-1'): FeedItemRecord => ({
  contentLength: 5,
  discoveredAt: '2026-08-14T00:00:00.000Z',
  feedConnectionId: 'feed-1',
  feedItemId,
  id: `feed-1\u0000${feedItemId}`,
  itemTitle: '새 피드',
  message: null,
  publishedAt: '2026-08-14T00:00:00.000Z',
  sourceTitle: '테스트 피드',
  sourceUrl: `https://example.com/${feedItemId}`,
  status: 'queued',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
})

const createJob = (id = 'job-1', feedItemId = 'item-1'): FeedDialogueJob => ({
  createdAt: '2026-08-14T00:00:00.000Z',
  errorMessage: null,
  feedConnectionId: 'feed-1',
  feedItemId,
  id,
  itemTitle: '새 피드',
  modelId: 'int8',
  publishedAt: '2026-08-14T00:00:00.000Z',
  script: '새 소식',
  sourceTitle: '테스트 피드',
  sourceUrl: `https://example.com/${feedItemId}`,
  status: 'queued',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

const createVoiceClient = (): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn<SupertonicClient['generate']>(),
  generateStream: vi.fn<SupertonicClient['generateStream']>(),
  initialize: vi.fn<SupertonicClient['initialize']>(async () => ({ok: true, value: undefined})),
})

const createFixture = () => {
  const dialogueRepository = {
    deleteDialogue: vi.fn<FeedGenerationDialogueRepository['deleteDialogue']>(
      async () => undefined,
    ),
    saveDialogue: vi.fn<FeedGenerationDialogueRepository['saveDialogue']>(async () => undefined),
  } satisfies FeedGenerationDialogueRepository
  const feedRepository = {
    complete: vi.fn<FeedGenerationRepository['complete']>(async () => undefined),
    deleteJobs: vi.fn<FeedGenerationRepository['deleteJobs']>(async () => undefined),
    interruptUnfinishedJobs: vi.fn<FeedGenerationRepository['interruptUnfinishedJobs']>(
      async () => [],
    ),
    listItems: vi.fn<FeedGenerationRepository['listItems']>(async () => [createItem()]),
    listJobs: vi.fn<FeedGenerationRepository['listJobs']>(async () => [createJob()]),
    updateJob: vi.fn<FeedGenerationRepository['updateJob']>(async () => undefined),
  } satisfies FeedGenerationRepository
  const voiceClient = createVoiceClient()
  const runtime = {
    createVoiceClient: vi.fn(async () => voiceClient),
    generateDialogueAudio: vi.fn<FeedGenerationRuntime['generateDialogueAudio']>(async () => ({
      ok: true,
      value: {
        audio: new Blob(['audio']),
        durationMs: 1000,
        segments: [{durationMs: 1000, index: 0, startMs: 0, text: '새 소식'}],
      },
    })),
    isModelDownloaded: vi.fn(async () => true),
  } satisfies FeedGenerationRuntime
  const onCompleted = vi.fn(async () => undefined)
  const onDiscarded = vi.fn(async () => undefined)
  const onFailed = vi.fn(async () => undefined)
  const onRecovery = vi.fn()
  let state: PFeedState = {message: '대기 중', status: 'idle'}
  const setState = vi.fn((nextState: PFeedState) => {
    state = nextState
  })
  const ids = ['dialogue-1', 'audio-1']
  const controller = createFeedGenerationController({
    createId: () => ids.shift() ?? 'fallback-id',
    dialogueRepository,
    feedRepository,
    getConnections: () => [createConnection()],
    getState: () => state,
    isRecoveryDismissed: () => false,
    now: () => new Date('2026-08-14T00:00:00.000Z'),
    onCompleted,
    onDiscarded,
    onFailed,
    onRecovery,
    resolveGenerationSettings: async () => ({modelId: 'int8', voiceId: 'Yuna'}),
    runtime,
    setState,
  })

  return {
    controller,
    dialogueRepository,
    feedRepository,
    onCompleted,
    onFailed,
    onRecovery,
    runtime,
    setState,
    voiceClient,
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it('should generate and persist a queued feed job through the controller boundary', async () => {
  const fixture = createFixture()
  vi.mocked(fixture.voiceClient.initialize).mockImplementation(async (options) => {
    options.onProgress({fileName: '모델', loadedBytes: 1, totalBytes: 2})
    options.onStatus('WASM 준비 중')
    return {ok: true, value: undefined}
  })
  fixture.controller.schedule({jobIds: ['job-1']})

  await vi.waitFor(() => expect(fixture.onCompleted).toHaveBeenCalledOnce())

  expect(fixture.setState).toHaveBeenCalledWith({
    message: 'WASM 준비 중',
    progress: 50,
    status: 'preparing',
  })
  expect(fixture.dialogueRepository.saveDialogue).toHaveBeenCalledOnce()
  expect(fixture.feedRepository.complete).toHaveBeenCalledOnce()
})

it('should cancel active generation and expose interrupted jobs for recovery', async () => {
  const fixture = createFixture()
  const interruptedJob = {...createJob(), status: 'interrupted' as const}
  let finishGeneration: () => void = () => undefined
  let generationSignal: AbortSignal | undefined
  fixture.feedRepository.interruptUnfinishedJobs.mockResolvedValue([interruptedJob])
  fixture.runtime.generateDialogueAudio.mockImplementation(
    (options) =>
      new Promise((resolve) => {
        generationSignal = options.signal
        finishGeneration = () => resolve({message: '취소됨', ok: false})
      }),
  )
  fixture.controller.schedule({jobIds: ['job-1']})
  await vi.waitFor(() => expect(fixture.runtime.generateDialogueAudio).toHaveBeenCalledOnce())

  await fixture.controller.cancel()

  expect(generationSignal?.aborted).toBe(true)
  expect(fixture.voiceClient.cancelGeneration).toHaveBeenCalledOnce()
  expect(fixture.voiceClient.dispose).toHaveBeenCalledOnce()
  expect(fixture.onRecovery).toHaveBeenCalledWith([interruptedJob])
  finishGeneration()
  await vi.waitFor(() => expect(fixture.feedRepository.complete).not.toHaveBeenCalled())
})

it('should remove queued jobs without interrupting the active job', async () => {
  const fixture = createFixture()
  const secondJob = createJob('job-2', 'item-2')
  fixture.feedRepository.listJobs.mockResolvedValue([createJob(), secondJob])
  let finishGeneration: () => void = () => undefined
  fixture.runtime.generateDialogueAudio.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishGeneration = () => resolve({message: '테스트 종료', ok: false})
      }),
  )
  fixture.controller.schedule({jobIds: ['job-1', 'job-2']})
  await vi.waitFor(() => expect(fixture.runtime.generateDialogueAudio).toHaveBeenCalledOnce())

  fixture.controller.remove(new Set(['job-2']))
  finishGeneration()

  await vi.waitFor(() => expect(fixture.onFailed).toHaveBeenCalledOnce())
  expect(fixture.runtime.generateDialogueAudio).toHaveBeenCalledOnce()
})

it('should dispose its active client and ignore late model initialization', async () => {
  const fixture = createFixture()
  let finishInitialization: () => void = () => undefined
  vi.mocked(fixture.voiceClient.initialize).mockImplementation(
    () =>
      new Promise((resolve) => {
        finishInitialization = () => resolve({ok: true, value: undefined})
      }),
  )
  fixture.controller.schedule({jobIds: ['job-1']})
  await vi.waitFor(() => expect(fixture.voiceClient.initialize).toHaveBeenCalledOnce())

  fixture.controller.dispose()
  finishInitialization()

  await vi.waitFor(() => expect(fixture.voiceClient.dispose).toHaveBeenCalled())
  expect(fixture.runtime.generateDialogueAudio).not.toHaveBeenCalled()
})

it('should ignore a voice client created after disposal', async () => {
  const fixture = createFixture()
  let finishClientCreation: () => void = () => undefined
  fixture.runtime.createVoiceClient.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishClientCreation = () => resolve(fixture.voiceClient)
      }),
  )
  fixture.controller.schedule({jobIds: ['job-1']})
  await vi.waitFor(() => expect(fixture.runtime.createVoiceClient).toHaveBeenCalledOnce())

  fixture.controller.dispose()
  finishClientCreation()

  await vi.waitFor(() => expect(fixture.voiceClient.dispose).toHaveBeenCalledOnce())
  expect(fixture.setState).not.toHaveBeenCalled()
  expect(fixture.runtime.generateDialogueAudio).not.toHaveBeenCalled()
})
