import {renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {
  type FeedDialogueListItem,
  findFeedNotificationDialogue,
  findRemovableExpiredDialogues,
} from '..'
import type {PEventContextValue} from '../../focus-room-dialogue'
import type {SupertonicClient} from '../../supertonic'
import {feedGenerationRuntime} from '../generation-runtime'
import type {FeedDialogueJob, FeedItemRecord} from '../feed-dialogue-schema'
import type {FeedSyncSummary, SynchronizeFeedsOptions} from '../feed-sync'
import type {FeedConnection} from '../schema'
import {FEED_CONNECTIONS_CHANGED_EVENT} from '../use-feed-connections'
import {usePFeeds} from '../use-focus-room-feeds'

const syncMocks = vi.hoisted(() => ({
  synchronizeFeeds: vi.fn(),
}))
const lifecycleMocks = vi.hoisted(() => ({
  deleteExpiredFeedDialogues: vi.fn(),
  discardFeedJobs: vi.fn(),
  loadFeedDialogueList: vi.fn(),
  loadFeedIssues: vi.fn(),
}))
const repairMocks = vi.hoisted(() => ({repairStoredDevFeedDialogues: vi.fn()}))
const preparationMocks = vi.hoisted(() => ({prepareFeedGeneration: vi.fn()}))
const queueMocks = vi.hoisted(() => ({
  processScheduledFeedJob: vi.fn(),
  scheduleFeedJobs: vi.fn(),
}))
const gateMocks = vi.hoisted(() => ({
  beginFeedSync: vi.fn(),
  createFeedSyncGate: vi.fn(),
  finishFeedSync: vi.fn(),
}))

const repositoryMocks = vi.hoisted(() => {
  const dialogueRepository = {
    deleteDialogue: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    getDialogue: vi.fn().mockResolvedValue(null),
    saveDialogue: vi.fn().mockResolvedValue(undefined),
  }
  const feedRepository = {
    complete: vi.fn().mockResolvedValue(undefined),
    deleteJobs: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    interruptUnfinishedJobs: vi.fn().mockResolvedValue([]),
    listExpiredMetadata: vi.fn().mockResolvedValue([]),
    listItems: vi.fn().mockResolvedValue([]),
    listJobs: vi.fn().mockResolvedValue([]),
    listMetadata: vi.fn().mockResolvedValue([]),
    markListened: vi.fn().mockResolvedValue(undefined),
    removeMetadata: vi.fn().mockResolvedValue(undefined),
    retryJobs: vi.fn().mockResolvedValue(undefined),
    updateJob: vi.fn().mockResolvedValue(undefined),
  }

  return {
    dialogueRepository,
    feedRepository,
    listConnections: vi.fn<() => ReadonlyArray<FeedConnection>>(() => []),
  }
})

vi.mock('../../focus-room-dialogue/repository', () => ({
  createPDialogueRepository: () => repositoryMocks.dialogueRepository,
}))
vi.mock('../feed-dialogue-repository', () => ({
  createFeedDialogueRepository: () => repositoryMocks.feedRepository,
}))
vi.mock('../feed-dialogue-repair', () => ({
  repairStoredDevFeedDialogues: repairMocks.repairStoredDevFeedDialogues,
}))
vi.mock('../repository', () => ({
  createFeedConnectionRepository: () => ({list: repositoryMocks.listConnections}),
}))
vi.mock('../feed-sync', () => ({
  synchronizeFeeds: syncMocks.synchronizeFeeds,
}))
vi.mock('../feed-dialogue-lifecycle', () => ({
  deleteExpiredFeedDialogues: lifecycleMocks.deleteExpiredFeedDialogues,
  discardFeedJobs: lifecycleMocks.discardFeedJobs,
  loadFeedDialogueList: lifecycleMocks.loadFeedDialogueList,
  loadFeedIssues: lifecycleMocks.loadFeedIssues,
}))
vi.mock('../generation-preparation', () => ({
  prepareFeedGeneration: preparationMocks.prepareFeedGeneration,
}))
vi.mock('../generation-queue', () => ({
  processScheduledFeedJob: queueMocks.processScheduledFeedJob,
  scheduleFeedJobs: queueMocks.scheduleFeedJobs,
}))
vi.mock('../sync-gate', () => ({
  beginFeedSync: gateMocks.beginFeedSync,
  createFeedSyncGate: gateMocks.createFeedSyncGate,
  finishFeedSync: gateMocks.finishFeedSync,
}))

beforeEach(() => {
  vi.clearAllMocks()
  repositoryMocks.dialogueRepository.deleteDialogue.mockResolvedValue(undefined)
  repositoryMocks.dialogueRepository.getDialogue.mockResolvedValue(null)
  repositoryMocks.dialogueRepository.saveDialogue.mockResolvedValue(undefined)
  repositoryMocks.feedRepository.complete.mockResolvedValue(undefined)
  repositoryMocks.feedRepository.deleteJobs.mockResolvedValue(undefined)
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([])
  repositoryMocks.feedRepository.listExpiredMetadata.mockResolvedValue([])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([])
  repositoryMocks.feedRepository.listMetadata.mockResolvedValue([])
  repositoryMocks.feedRepository.markListened.mockResolvedValue(undefined)
  repositoryMocks.feedRepository.removeMetadata.mockResolvedValue(undefined)
  repositoryMocks.feedRepository.retryJobs.mockResolvedValue(undefined)
  repositoryMocks.feedRepository.updateJob.mockResolvedValue(undefined)
  repositoryMocks.listConnections.mockReturnValue([])
  lifecycleMocks.deleteExpiredFeedDialogues.mockResolvedValue(0)
  lifecycleMocks.discardFeedJobs.mockResolvedValue([])
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue([])
  lifecycleMocks.loadFeedIssues.mockResolvedValue([])
  repairMocks.repairStoredDevFeedDialogues.mockResolvedValue(0)
  preparationMocks.prepareFeedGeneration.mockImplementation(async (options) => {
    const settings = await options.resolveGenerationSettings(options.job.feedConnectionId)

    if (settings === null) {
      return {status: 'connection-missing'}
    }

    const job = {...options.job, modelId: settings.modelId, voiceId: settings.voiceId}
    return (await options.prepareModel(settings.modelId))
      ? {job, status: 'ready'}
      : {job, status: 'model-preparation-failed'}
  })
  queueMocks.processScheduledFeedJob.mockImplementation(async (options) => {
    const jobs = await options.listJobs()
    const job = jobs.find((item: FeedDialogueJob) => item.id === options.scheduledJob.id)

    if (job !== undefined) {
      try {
        await options.generate(job, options.scheduledJob.allowModelDownload)
      } catch (error: unknown) {
        await options.handleFailure(job, error)
      }
    }
  })
  queueMocks.scheduleFeedJobs.mockImplementation(
    (queue, jobIds, run, allowModelDownload = false) => {
      queue.push(...jobIds.map((id: string) => ({allowModelDownload, id})))
      if (jobIds.length > 0) {
        void run()
      }
    },
  )
  gateMocks.createFeedSyncGate.mockReturnValue({isActive: false, isRequested: false})
  gateMocks.beginFeedSync.mockImplementation((gate) => {
    if (gate.isActive) {
      gate.isRequested = true
      return false
    }
    gate.isActive = true
    return true
  })
  gateMocks.finishFeedSync.mockImplementation((gate) => {
    gate.isActive = false
    const requested = gate.isRequested
    gate.isRequested = false
    return requested
  })
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [],
    successfulConnections: 0,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

const createEventContext = (
  refreshDialogues = vi.fn(async () => undefined),
): PEventContextValue => ({
  activeDialogueId: vi.fn(() => null),
  activeSegmentCount: vi.fn(() => 0),
  activeSegmentMood: vi.fn(() => null),
  activeSegmentPosition: vi.fn(() => null),
  activeText: vi.fn(() => null),
  activeViseme: vi.fn(() => 'rest' as const),
  deleteDialogue: vi.fn(async () => undefined),
  dialogues: vi.fn(() => []),
  enterFocusRoom: vi.fn(),
  entryDialogueId: vi.fn(() => null),
  entryDialogueIds: vi.fn(() => []),
  errorMessage: vi.fn(() => null),
  eventDialogueIds: vi.fn(() => ({})),
  eventPlaybackModes: vi.fn(() => ({})),
  getAudio: vi.fn(async () => null),
  hasEnteredFocusRoom: vi.fn(() => false),
  isDialoguePlaybackBlocked: vi.fn(() => false),
  isDialoguePlaying: vi.fn(() => false),
  isDialogueScheduled: vi.fn(() => false),
  isEntryPlaybackBlocked: vi.fn(() => false),
  isLoading: vi.fn(() => false),
  onStopDialoguePlayback: vi.fn(),
  onStopEntryPlayback: vi.fn(),
  playDialogue: vi.fn(async () => undefined),
  playDialogueEvents: vi.fn(async () => undefined),
  playDialogueSequence: vi.fn(async () => undefined),
  refreshDialogues,
  retryDialoguePlayback: vi.fn(),
  retryEntryPlayback: vi.fn(),
  scheduledDialogueCount: vi.fn(() => 0),
  setEntryDialogue: vi.fn(async () => undefined),
  setEntryDialogues: vi.fn(async () => undefined),
  setEventDialogue: vi.fn(async () => undefined),
  setEventDialogues: vi.fn(async () => undefined),
  setEventPlaybackMode: vi.fn(async () => undefined),
  skipDialoguePlayback: vi.fn(),
})

const createDialogue = (dialogueId: string, listenedAt: string | null): FeedDialogueListItem => ({
  dialogue: {
    audioKey: `audio-${dialogueId}`,
    createdAt: '2026-08-14T00:00:00.000Z',
    durationMs: 1000,
    id: dialogueId,
    language: 'ko',
    modelId: 'full',
    segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
    text: '안녕하세요',
    updatedAt: '2026-08-14T00:00:00.000Z',
    version: 1,
    voiceId: 'Yuna',
  },
  metadata: {
    createdAt: '2026-08-14T00:00:00.000Z',
    dialogueId,
    expiresAt: '2026-08-16T00:00:00.000Z',
    feedConnectionId: 'feed-1',
    feedItemId: `item-${dialogueId}`,
    itemTitle: `피드 ${dialogueId}`,
    listenedAt,
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: '테스트 피드',
    sourceUrl: `https://example.com/${dialogueId}`,
    version: 1,
  },
})

const createConnection = (overrides: Partial<FeedConnection> = {}): FeedConnection => ({
  createdAt: '2026-08-14T00:00:00.000Z',
  id: 'feed-1',
  updatedAt: '2026-08-14T00:00:00.000Z',
  url: 'https://example.com/feed.xml',
  version: 1,
  voiceId: 'Yuna',
  ...overrides,
})

const createItem = (overrides: Partial<FeedItemRecord> = {}): FeedItemRecord => ({
  contentLength: 5,
  discoveredAt: '2026-08-14T00:00:00.000Z',
  feedConnectionId: 'feed-1',
  feedItemId: 'item-1',
  id: 'feed-1\u0000item-1',
  itemTitle: '새 피드',
  message: null,
  publishedAt: '2026-08-14T00:00:00.000Z',
  sourceTitle: '테스트 피드',
  sourceUrl: 'https://example.com/item-1',
  status: 'queued',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  ...overrides,
})

const createJob = (overrides: Partial<FeedDialogueJob> = {}): FeedDialogueJob => {
  const item = createItem()
  return {
    createdAt: item.discoveredAt,
    errorMessage: null,
    feedConnectionId: item.feedConnectionId,
    feedItemId: item.feedItemId,
    id: 'job-1',
    itemTitle: item.itemTitle,
    modelId: 'int8',
    publishedAt: item.publishedAt,
    script: '새 소식',
    sourceTitle: item.sourceTitle,
    sourceUrl: item.sourceUrl,
    status: 'queued',
    updatedAt: item.updatedAt,
    version: 1,
    voiceId: 'Yuna',
    ...overrides,
  }
}

const createVoiceClient = (
  initializeResult: Awaited<ReturnType<SupertonicClient['initialize']>> = {
    ok: true,
    value: undefined,
  },
): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn<SupertonicClient['generate']>(),
  generateStream: vi.fn<SupertonicClient['generateStream']>(),
  initialize: vi.fn(async () => initializeResult),
})

it('should prepare a model, report generation progress, and persist a failed job', async () => {
  const connection = createConnection()
  const job = createJob()
  const item = createItem()
  const initializeOptions: Array<Parameters<SupertonicClient['initialize']>[0]> = []
  const voiceClient = createVoiceClient()
  vi.mocked(voiceClient.initialize).mockImplementation(async (options) => {
    initializeOptions.push(options)
    options.onProgress({fileName: '모델', loadedBytes: 1, totalBytes: 2})
    options.onStatus('WASM 준비 중')
    return {ok: true, value: undefined}
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  const generate = vi
    .spyOn(feedGenerationRuntime, 'generateDialogueAudio')
    .mockImplementation(async (options) => {
      options.onChunk?.(1, 2)
      return {message: '생성 실패', ok: false}
    })
  repositoryMocks.listConnections.mockReturnValue([connection])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([item])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    expect(await options.prepareModel('int8')).toBe(true)
    expect(await options.prepareModel('int8')).toBe(true)
    return {job, status: 'ready'}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalled())

  expect(generate).toHaveBeenCalledOnce()
  expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalledWith(
    expect.objectContaining({errorMessage: '생성 실패', status: 'failed'}),
    expect.objectContaining({message: '생성 실패', status: 'failed'}),
  )
  expect(initializeOptions).toHaveLength(1)
  expect(view.result.state().status).toBe('idle')
  initializeOptions[0]?.onStatus('다시 준비 중')
  expect(view.result.state()).toMatchObject({progress: null, status: 'preparing'})
  view.cleanup()
  initializeOptions[0]?.onProgress({fileName: '늦은 모델', loadedBytes: 2, totalBytes: 2})
  initializeOptions[0]?.onStatus('늦은 상태')
})

it.each([
  {
    message: '음성 모델 다운로드에 동의한 뒤 다시 시도해 주세요.',
    status: 'model-download-required' as const,
  },
  {
    message: '피드 음성 모델을 준비하지 못했어요.',
    status: 'model-preparation-failed' as const,
  },
])('should fail a job for $status preparation', async ({message, status}) => {
  const connection = createConnection()
  const job = createJob()
  repositoryMocks.listConnections.mockReturnValue([connection])
  repositoryMocks.feedRepository.listJobs
    .mockResolvedValueOnce([job])
    .mockResolvedValue([createJob({id: 'failed-recovery', status: 'failed'})])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockResolvedValueOnce({job, status})
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalled())

  expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalledWith(
    expect.objectContaining({errorMessage: message}),
    undefined,
  )
  view.cleanup()
})

it('should discard a queued job after its feed is unsubscribed', async () => {
  const job = createJob()
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  queueMocks.scheduleFeedJobs.mockImplementationOnce((queue, jobIds, run) => {
    queue.push(...jobIds.map((id: string) => ({allowModelDownload: false, id})))
    repositoryMocks.listConnections.mockReturnValue([])
    void run()
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.deleteJobs).toHaveBeenCalled())

  expect(preparationMocks.prepareFeedGeneration).not.toHaveBeenCalled()
  view.cleanup()
})

it('should fail a ready job when preparation did not provide a client', async () => {
  const job = createJob()
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([createItem()])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockResolvedValueOnce({job, status: 'ready'})
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalled())

  expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalledWith(
    expect.objectContaining({errorMessage: '피드 음성 모델을 준비하지 못했어요.'}),
    expect.any(Object),
  )
  view.cleanup()
})

it('should complete a generated feed dialogue and roll it back on metadata failure', async () => {
  const job = createJob()
  const item = createItem()
  const voiceClient = createVoiceClient()
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {
      audio: new Blob(['audio']),
      durationMs: 1000,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '새 소식'}],
    },
  })
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([item])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    await options.prepareModel('int8')
    return {job, status: 'ready'}
  })
  const events = createEventContext()
  const view = renderHook(() => usePFeeds({events}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.complete).toHaveBeenCalledOnce())

  expect(repositoryMocks.dialogueRepository.saveDialogue).toHaveBeenCalledWith(
    expect.objectContaining({
      dialogue: expect.objectContaining({id: '00000000-0000-4000-8000-000000000001'}),
    }),
  )
  expect(events.refreshDialogues).toHaveBeenCalled()
  view.cleanup()

  vi.clearAllMocks()
  repositoryMocks.feedRepository.complete.mockRejectedValueOnce(new Error('complete failed'))
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([item])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    await options.prepareModel('int8')
    return {job, status: 'ready'}
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(createVoiceClient())
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {
      audio: new Blob(['audio']),
      durationMs: 1000,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '새 소식'}],
    },
  })
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000003')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000004')
  const rollbackView = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() =>
    expect(repositoryMocks.dialogueRepository.deleteDialogue).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000003',
    ),
  )
  rollbackView.cleanup()
})

it('should keep generation active while moving to the next queued feed dialogue', async () => {
  const firstJob = createJob({id: 'job-1', itemTitle: '첫 번째 피드', script: '첫 번째 소식'})
  const secondJob = createJob({
    feedItemId: 'item-2',
    id: 'job-2',
    itemTitle: '두 번째 피드',
    script: '두 번째 소식',
  })
  const firstItem = createItem({itemTitle: firstJob.itemTitle})
  const secondItem = createItem({
    feedItemId: secondJob.feedItemId,
    id: 'feed-1\u0000item-2',
    itemTitle: secondJob.itemTitle,
  })
  const voiceClient = createVoiceClient()
  let finishSecondGeneration: () => void = () => undefined
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio')
    .mockResolvedValueOnce({
      ok: true,
      value: {
        audio: new Blob(['first audio']),
        durationMs: 1000,
        segments: [{durationMs: 1000, index: 0, startMs: 0, text: firstJob.script}],
      },
    })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSecondGeneration = () => resolve({message: '테스트 종료', ok: false})
        }),
    )
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000011')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000012')
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([firstJob, secondJob])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([firstItem, secondItem])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [firstJob.id, secondJob.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementation(async (options) => {
    await options.prepareModel(options.job.modelId)
    return {job: options.job, status: 'ready'}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() =>
    expect(feedGenerationRuntime.generateDialogueAudio).toHaveBeenCalledTimes(2),
  )

  expect(repositoryMocks.feedRepository.complete).toHaveBeenCalledOnce()
  expect(view.result.state()).toEqual({
    message: '두 번째 피드 음성을 만들고 있어요.',
    progress: null,
    status: 'generating',
  })

  finishSecondGeneration()
  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))
  view.cleanup()
})

it('should cancel active generation, clear queued jobs, and preserve them for recovery', async () => {
  const firstJob = createJob({id: 'job-1', itemTitle: '첫 번째 피드'})
  const secondJob = createJob({feedItemId: 'item-2', id: 'job-2', itemTitle: '둘째 피드'})
  const interruptedJobs = [
    {...firstJob, status: 'interrupted' as const},
    {...secondJob, status: 'interrupted' as const},
  ]
  const voiceClient = createVoiceClient()
  let finishGeneration: () => void = () => undefined
  const generationSignals: Array<AbortSignal | undefined> = []
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockImplementation(
    (options) =>
      new Promise((resolve) => {
        generationSignals.push(options.signal)
        finishGeneration = () => resolve({message: '취소됨', ok: false})
      }),
  )
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([firstJob, secondJob])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([createItem()])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue(interruptedJobs)
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [firstJob.id, secondJob.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementation(async (options) => {
    await options.prepareModel(options.job.modelId)
    return {job: options.job, status: 'ready'}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(feedGenerationRuntime.generateDialogueAudio).toHaveBeenCalledOnce())
  await view.result.cancelProcessing()

  expect(voiceClient.cancelGeneration).toHaveBeenCalledOnce()
  expect(voiceClient.dispose).toHaveBeenCalledOnce()
  expect(generationSignals[0]?.aborted).toBe(true)
  expect(repositoryMocks.feedRepository.interruptUnfinishedJobs).toHaveBeenCalledTimes(2)
  expect(view.result.recoveryJobs()).toEqual(interruptedJobs)
  finishGeneration()
  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))
  expect(feedGenerationRuntime.generateDialogueAudio).toHaveBeenCalledOnce()
  expect(repositoryMocks.feedRepository.complete).not.toHaveBeenCalled()
  expect(repositoryMocks.feedRepository.updateJob).not.toHaveBeenCalled()
  view.cleanup()
})

it('should stop a queued job before model preparation starts', async () => {
  const job = createJob()
  const connection = createConnection()
  let cancelProcessing: () => Promise<void> = async () => undefined
  let cancellation: Promise<void> | null = null
  repositoryMocks.listConnections.mockReturnValueOnce([connection]).mockImplementation(() => {
    cancellation = cancelProcessing()
    return [connection]
  })
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  const generate = vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio')
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  cancelProcessing = view.result.cancelProcessing

  await vi.waitFor(() => expect(cancellation).not.toBeNull())
  await cancellation

  expect(preparationMocks.prepareFeedGeneration).not.toHaveBeenCalled()
  expect(generate).not.toHaveBeenCalled()
  view.cleanup()
})

it('should ignore model preparation that finishes after cancellation', async () => {
  const job = createJob()
  const voiceClient = createVoiceClient()
  let finishPreparation: () => void = () => undefined
  preparationMocks.prepareFeedGeneration.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishPreparation = () => resolve({job, status: 'ready'})
      }),
  )
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  const generate = vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio')
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(preparationMocks.prepareFeedGeneration).toHaveBeenCalledOnce())
  await view.result.cancelProcessing()
  finishPreparation()

  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))
  expect(generate).not.toHaveBeenCalled()
  view.cleanup()
})

it('should ignore a generated result when cancellation happens while its item loads', async () => {
  const job = createJob()
  const item = createItem()
  let finishItemLoad: () => void = () => undefined
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishItemLoad = () => resolve([item])
      }),
  )
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementation(async (options) => {
    await options.prepareModel(job.modelId)
    return {job, status: 'ready'}
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(createVoiceClient())
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {
      audio: new Blob(['audio']),
      durationMs: 1000,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: job.script}],
    },
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.listItems).toHaveBeenCalledOnce())
  await view.result.cancelProcessing()
  finishItemLoad()

  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))
  expect(repositoryMocks.dialogueRepository.saveDialogue).not.toHaveBeenCalled()
  view.cleanup()
})

it('should remove generated audio when cancellation happens while it saves', async () => {
  const job = createJob()
  const item = createItem()
  let finishSave: () => void = () => undefined
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([item])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  repositoryMocks.dialogueRepository.saveDialogue.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishSave = resolve
      }),
  )
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementation(async (options) => {
    await options.prepareModel(job.modelId)
    return {job, status: 'ready'}
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(createVoiceClient())
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {
      audio: new Blob(['audio']),
      durationMs: 1000,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: job.script}],
    },
  })
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000021')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000022')
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.dialogueRepository.saveDialogue).toHaveBeenCalled())
  await view.result.cancelProcessing()
  finishSave()

  await vi.waitFor(() =>
    expect(repositoryMocks.dialogueRepository.deleteDialogue).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000021',
    ),
  )
  expect(repositoryMocks.feedRepository.complete).not.toHaveBeenCalled()
  view.cleanup()
})
