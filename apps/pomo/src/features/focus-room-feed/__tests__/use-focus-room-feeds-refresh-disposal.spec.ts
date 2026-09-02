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
    failJob: vi.fn().mockResolvedValue(true),
    interruptUnfinishedJobs: vi.fn().mockResolvedValue([]),
    listExpiredMetadata: vi.fn().mockResolvedValue([]),
    listItems: vi.fn().mockResolvedValue([]),
    listJobs: vi.fn().mockResolvedValue([]),
    listMetadata: vi.fn().mockResolvedValue([]),
    markListened: vi.fn().mockResolvedValue(undefined),
    removeMetadata: vi.fn().mockResolvedValue(undefined),
    retryJobs: vi.fn().mockResolvedValue(undefined),
    startJob: vi.fn().mockResolvedValue(true),
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
  repositoryMocks.feedRepository.failJob.mockResolvedValue(true)
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([])
  repositoryMocks.feedRepository.listExpiredMetadata.mockResolvedValue([])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([])
  repositoryMocks.feedRepository.listMetadata.mockResolvedValue([])
  repositoryMocks.feedRepository.markListened.mockResolvedValue(undefined)
  repositoryMocks.feedRepository.removeMetadata.mockResolvedValue(undefined)
  repositoryMocks.feedRepository.retryJobs.mockResolvedValue(undefined)
  repositoryMocks.feedRepository.startJob.mockResolvedValue(true)
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

it('should refresh visible, changed, and polled feeds and report callback failures', async () => {
  vi.useFakeTimers()
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const visibility = vi.spyOn(document, 'visibilityState', 'get')
  visibility.mockReturnValue('hidden')
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.advanceTimersByTimeAsync(0)

  document.dispatchEvent(new Event('visibilitychange'))
  expect(gateMocks.beginFeedSync).toHaveBeenCalledTimes(1)

  gateMocks.finishFeedSync.mockImplementation(() => {
    throw new Error('finish failed')
  })
  gateMocks.beginFeedSync.mockReturnValue(true)
  visibility.mockReturnValue('visible')
  document.dispatchEvent(new Event('visibilitychange'))
  window.dispatchEvent(new CustomEvent(FEED_CONNECTIONS_CHANGED_EVENT))
  await vi.runOnlyPendingTimersAsync()

  await vi.waitFor(() => {
    expect(error).toHaveBeenCalledWith(
      'Failed to refresh visible focus room feeds.',
      expect.any(Error),
    )
    expect(error).toHaveBeenCalledWith(
      'Failed to refresh changed focus room feeds.',
      expect.any(Error),
    )
    expect(error).toHaveBeenCalledWith('Failed to poll focus room feeds.', expect.any(Error))
  })
  view.cleanup()
  vi.useRealTimers()
})

it('should dismiss every visible recovery job', async () => {
  const jobs = [createJob({id: 'failed', status: 'failed'})]
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue(jobs)
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(view.result.recoveryJobs()).toEqual(jobs))

  view.result.dismissRecovery()

  expect(view.result.recoveryJobs()).toEqual([])
  view.cleanup()
})

it('should discard a stale client when a newer model preparation wins', async () => {
  const job = createJob()
  const firstInitialization =
    Promise.withResolvers<Awaited<ReturnType<SupertonicClient['initialize']>>>()
  const firstClient = createVoiceClient()
  const secondClient = createVoiceClient()
  vi.mocked(firstClient.initialize).mockReturnValue(firstInitialization.promise)
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient')
    .mockResolvedValueOnce(firstClient)
    .mockResolvedValueOnce(secondClient)
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    message: '완료',
    ok: false,
  })
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    expect(options.now()).toEqual(expect.any(String))
    const first = options.prepareModel('int8')
    const second = options.prepareModel('full')
    await second
    firstInitialization.resolve({ok: true, value: undefined})
    await first
    return {job: {...job, modelId: 'full'}, status: 'ready'}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(firstClient.dispose).toHaveBeenCalled())

  expect(secondClient.dispose).not.toHaveBeenCalled()
  view.cleanup()
})

it('should skip recovery state updates after disposal', async () => {
  const job = createJob()
  const recovery = Promise.withResolvers<ReadonlyArray<FeedDialogueJob>>()
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs
    .mockResolvedValueOnce([job])
    .mockReturnValueOnce(recovery.promise)
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
  await vi.waitFor(() => expect(repositoryMocks.feedRepository.listJobs).toHaveBeenCalledTimes(2))

  view.cleanup()
  recovery.resolve([createJob({id: 'failed', status: 'failed'})])
  await recovery.promise

  expect(view.result.recoveryJobs()).toEqual([])
})

it('should skip failure handling after disposal', async () => {
  const job = createJob()
  const clientCreation = Promise.withResolvers<SupertonicClient>()
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockReturnValue(clientCreation.promise)
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    await options.prepareModel('int8')
    return {job, status: 'ready'}
  })
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(feedGenerationRuntime.createVoiceClient).toHaveBeenCalled())

  view.cleanup()
  clientCreation.reject(new Error('late client failure'))
  await vi.waitFor(() =>
    expect(error).toHaveBeenCalledWith('Failed to process feed dialogue job.', expect.any(Error)),
  )
})

it('should stop a queue between jobs and reject later queue runs after disposal', async () => {
  const jobs = [createJob({id: 'first'}), createJob({id: 'second'})]
  const firstProcessing = Promise.withResolvers<void>()
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    createJob({id: 'recovery', status: 'failed'}),
  ])
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue(jobs)
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: jobs.map((job) => job.id),
    successfulConnections: 1,
  })
  queueMocks.processScheduledFeedJob
    .mockReturnValueOnce(firstProcessing.promise)
    .mockResolvedValueOnce(undefined)
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(queueMocks.processScheduledFeedJob).toHaveBeenCalledOnce())

  view.cleanup()
  firstProcessing.resolve()
  await firstProcessing.promise
  await view.result.retryRecovery()

  expect(queueMocks.processScheduledFeedJob).toHaveBeenCalledOnce()
})

it('should leave listening state unchanged when disposal ends a feed sequence', async () => {
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue([createDialogue('listen', null)])
  const playback = Promise.withResolvers<void>()
  const events = createEventContext()
  vi.mocked(events.playDialogueSequence).mockReturnValue(playback.promise)
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.dialogues()).toHaveLength(1))
  const listening = view.result.listenAll()
  await vi.waitFor(() => expect(view.result.isListening()).toBe(true))

  view.cleanup()
  playback.resolve()
  await listening

  expect(view.result.isListening()).toBe(true)
})
