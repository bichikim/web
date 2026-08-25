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

it('should notify only for the first unlistened feed dialogue', () => {
  const listened = createDialogue('newest', '2026-08-14T01:00:00.000Z')
  const unlistened = createDialogue('older', null)

  expect(findFeedNotificationDialogue([listened, unlistened])).toBe(unlistened)
})

it('should not notify when every feed dialogue was listened to', () => {
  const first = createDialogue('first', '2026-08-14T01:00:00.000Z')
  const second = createDialogue('second', '2026-08-14T01:05:00.000Z')

  expect(findFeedNotificationDialogue([first, second])).toBeNull()
})

it('should preserve expired dialogues that are active or queued for playback', () => {
  const active = createDialogue('active', null).metadata
  const queued = createDialogue('queued', null).metadata
  const idle = createDialogue('idle', null).metadata

  expect(
    findRemovableExpiredDialogues({
      expired: [active, queued, idle],
      isDialogueScheduled: (dialogueId) => dialogueId === 'active' || dialogueId === 'queued',
    }),
  ).toEqual([idle])
})

it('should refresh from lifecycle events and remove every listener on cleanup', async () => {
  const documentAdd = vi.spyOn(document, 'addEventListener')
  const documentRemove = vi.spyOn(document, 'removeEventListener')
  const windowAdd = vi.spyOn(window, 'addEventListener')
  const windowRemove = vi.spyOn(window, 'removeEventListener')
  const refreshDialogues = vi.fn(async () => undefined)
  const events = createEventContext(refreshDialogues)
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() =>
    expect(view.result.state()).toMatchObject({message: '설정에서 구독 피드를 추가해 주세요.'}),
  )

  const listCount = repositoryMocks.listConnections.mock.calls.length
  window.dispatchEvent(new CustomEvent(FEED_CONNECTIONS_CHANGED_EVENT))

  await vi.waitFor(() =>
    expect(repositoryMocks.listConnections.mock.calls.length).toBeGreaterThan(listCount),
  )
  expect(documentAdd).toHaveBeenCalledWith('visibilitychange', expect.any(Function), {})
  expect(windowAdd).toHaveBeenCalledWith(FEED_CONNECTIONS_CHANGED_EVENT, expect.any(Function), {})
  expect(windowAdd).toHaveBeenCalledWith(
    feedGenerationRuntime.settingsChangedEvent,
    expect.any(Function),
    {},
  )

  view.cleanup()

  expect(documentRemove).toHaveBeenCalledWith('visibilitychange', expect.any(Function), {})
  expect(windowRemove).toHaveBeenCalledWith(
    FEED_CONNECTIONS_CHANGED_EVENT,
    expect.any(Function),
    {},
  )
  expect(windowRemove).toHaveBeenCalledWith(
    feedGenerationRuntime.settingsChangedEvent,
    expect.any(Function),
    {},
  )
})

it('should synchronize again with changed connections after an active sync', async () => {
  const firstSync = Promise.withResolvers<FeedSyncSummary>()
  const initialConnection = {
    createdAt: '2026-08-14T00:00:00.000Z',
    id: 'feed-1',
    updatedAt: '2026-08-14T00:00:00.000Z',
    url: 'https://example.com/feed.xml',
    version: 1 as const,
    voiceId: 'default' as const,
  }
  repositoryMocks.listConnections.mockReturnValue([initialConnection])
  syncMocks.synchronizeFeeds.mockImplementationOnce(() => firstSync.promise)
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(syncMocks.synchronizeFeeds).toHaveBeenCalledTimes(1))

  repositoryMocks.listConnections.mockReturnValue([
    {...initialConnection, updatedAt: '2026-08-14T00:01:00.000Z', voiceId: 'Yuna'},
  ])
  window.dispatchEvent(new CustomEvent(FEED_CONNECTIONS_CHANGED_EVENT))
  firstSync.resolve({failures: [], queuedJobIds: [], successfulConnections: 1})

  await vi.waitFor(() => expect(syncMocks.synchronizeFeeds).toHaveBeenCalledTimes(2))
  expect(syncMocks.synchronizeFeeds).toHaveBeenLastCalledWith(
    expect.objectContaining({
      connections: [expect.objectContaining({id: 'feed-1', voiceId: 'Yuna'})],
    }),
  )
  view.cleanup()
})

it('should generate with a voice changed after the feed job settings were resolved', async () => {
  const jobUpdate = Promise.withResolvers<void>()
  const initialConnection: FeedConnection = {
    createdAt: '2026-08-14T00:00:00.000Z',
    id: 'feed-1',
    updatedAt: '2026-08-14T00:00:00.000Z',
    url: 'https://example.com/feed.xml',
    version: 1,
    voiceId: 'M1',
  }
  const item: FeedItemRecord = {
    contentLength: 5,
    discoveredAt: '2026-08-14T00:00:00.000Z',
    feedConnectionId: initialConnection.id,
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
  }
  const job: FeedDialogueJob = {
    createdAt: item.discoveredAt,
    errorMessage: null,
    feedConnectionId: initialConnection.id,
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
    voiceId: 'M1',
  }
  const voiceClient: SupertonicClient = {
    cancelGeneration: vi.fn(),
    dispose: vi.fn(),
    generate: vi.fn<SupertonicClient['generate']>(),
    generateStream: vi.fn<SupertonicClient['generateStream']>(),
    initialize: vi.fn(async () => ({ok: true as const, value: undefined})),
  }
  const generateDialogueAudio = vi
    .spyOn(feedGenerationRuntime, 'generateDialogueAudio')
    .mockResolvedValue({message: '진단 완료', ok: false})
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  vi.spyOn(feedGenerationRuntime, 'isModelDownloaded').mockResolvedValue(true)
  repositoryMocks.listConnections.mockReturnValue([initialConnection])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([item])
  repositoryMocks.feedRepository.updateJob.mockImplementationOnce(() => jobUpdate.promise)
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    await options.repository.updateJob(options.job)
    const settings = await options.resolveGenerationSettings(options.job.feedConnectionId)
    const currentJob = settings === null ? options.job : {...options.job, ...settings}
    await options.prepareModel(currentJob.modelId)
    return {job: currentJob, status: 'ready'}
  })
  syncMocks.synchronizeFeeds.mockImplementationOnce(async (options: SynchronizeFeedsOptions) => {
    expect(await options.resolveGenerationSettings(initialConnection.id)).toMatchObject({
      voiceId: 'M1',
    })
    repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
    repositoryMocks.listConnections.mockReturnValue([
      {...initialConnection, updatedAt: '2026-08-14T00:01:00.000Z', voiceId: 'Yuna'},
    ])
    window.dispatchEvent(new CustomEvent(FEED_CONNECTIONS_CHANGED_EVENT))
    return {failures: [], queuedJobIds: [job.id], successfulConnections: 1}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalledOnce())
  repositoryMocks.listConnections.mockReturnValue([
    {...initialConnection, updatedAt: '2026-08-14T00:02:00.000Z', voiceId: 'M2'},
  ])
  window.dispatchEvent(new CustomEvent(FEED_CONNECTIONS_CHANGED_EVENT))
  jobUpdate.resolve()

  await vi.waitFor(() => expect(generateDialogueAudio).toHaveBeenCalledOnce())
  const generationOptions = generateDialogueAudio.mock.calls[0]?.[0]
  view.cleanup()

  expect(generationOptions).toMatchObject({modelId: 'int8', voiceId: 'M2'})
})

it('should load dialogue, issue, and recovery state during initialization', async () => {
  const failedJob = createJob({id: 'failed', status: 'failed'})
  const interruptedJob = createJob({id: 'interrupted', status: 'interrupted'})
  const queuedJob = createJob({id: 'queued'})
  const issue = createItem({status: 'failed'})
  const available = [createDialogue('new', null), createDialogue('old', '2026-08-14T01:00:00Z')]
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    failedJob,
    interruptedJob,
    queuedJob,
  ])
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue(available)
  lifecycleMocks.loadFeedIssues.mockResolvedValue([issue])
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(view.result.dialogues()).toEqual(available))

  expect(view.result.recoveryJobs()).toEqual([failedJob, interruptedJob])
  expect(view.result.issues()).toEqual([issue])
  expect(view.result.unlistenedDialogues()).toEqual([available[0]])
  expect(view.result.latestReady()).toEqual(available[0])
  view.cleanup()
})

it('should mark an unlistened dialogue before playing it', async () => {
  const available = [createDialogue('new', null), createDialogue('old', '2026-08-14T01:00:00Z')]
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue(available)
  const events = createEventContext()
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.dialogues()).toEqual(available))

  await view.result.listen('new')
  await view.result.listen('old')

  expect(repositoryMocks.feedRepository.markListened).toHaveBeenCalledOnce()
  expect(view.result.dialogues()[0]?.metadata.listenedAt).not.toBeNull()
  expect(events.playDialogue).toHaveBeenNthCalledWith(1, 'new')
  expect(events.playDialogue).toHaveBeenNthCalledWith(2, 'old')
  view.cleanup()
})

it('should play all unlistened dialogues once and mark sequence callbacks', async () => {
  const available = [createDialogue('first', null), createDialogue('second', null)]
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue(available)
  const playback = Promise.withResolvers<void>()
  const events = createEventContext()
  vi.mocked(events.playDialogueSequence).mockReturnValue(playback.promise)
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.dialogues()).toEqual(available))

  const first = view.result.listenAll()
  await vi.waitFor(() => expect(events.playDialogueSequence).toHaveBeenCalledOnce())
  const second = view.result.listenAll()
  const callbacks = vi.mocked(events.playDialogueSequence).mock.calls[0]?.[0]
  await callbacks?.onDialogueStart('second')
  await callbacks?.onSequenceStop(['first'])
  playback.resolve()
  await Promise.all([first, second])

  expect(vi.mocked(events.playDialogueSequence).mock.calls[0]?.[0].dialogueIds).toEqual([
    'second',
    'first',
  ])
  expect(repositoryMocks.feedRepository.markListened).toHaveBeenCalledTimes(2)
  expect(view.result.isListening()).toBe(false)
  view.cleanup()
})

it('should skip listening to an empty feed batch', async () => {
  const events = createEventContext()
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))

  await view.result.listenAll()

  expect(events.playDialogueSequence).not.toHaveBeenCalled()
  view.cleanup()
})

it('should delete, dismiss, and retry recovery jobs', async () => {
  const jobs = [createJob({id: 'failed', status: 'failed'})]
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue(jobs)
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(view.result.recoveryJobs()).toEqual(jobs))

  await view.result.deleteRecovery()
  expect(repositoryMocks.feedRepository.deleteJobs).toHaveBeenCalledWith(
    ['failed'],
    expect.any(String),
  )
  expect(view.result.recoveryJobs()).toEqual([])

  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue(jobs)
  view.cleanup()

  const retryView = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(retryView.result.recoveryJobs()).toEqual(jobs))
  await retryView.result.retryRecovery()
  expect(repositoryMocks.feedRepository.retryJobs).toHaveBeenCalledWith(
    ['failed'],
    expect.any(String),
  )
  expect(queueMocks.scheduleFeedJobs).toHaveBeenCalledWith(
    expect.any(Array),
    ['failed'],
    expect.any(Function),
    true,
  )
  retryView.result.dismissRecovery()
  expect(retryView.result.recoveryJobs()).toEqual([])
  retryView.cleanup()
})

it('should reload dialogues after metadata removal succeeds or fails', async () => {
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue([createDialogue('delete-me', null)])
  const events = createEventContext()
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.dialogues()).toHaveLength(1))

  await view.result.onDeleteDialogue('delete-me')
  expect(events.deleteDialogue).toHaveBeenCalledWith('delete-me')
  expect(repositoryMocks.feedRepository.removeMetadata).toHaveBeenCalledWith('delete-me')

  repositoryMocks.feedRepository.removeMetadata.mockRejectedValueOnce(new Error('remove failed'))
  await expect(view.result.onDeleteDialogue('delete-me')).rejects.toThrow('remove failed')
  expect(lifecycleMocks.loadFeedDialogueList).toHaveBeenCalledTimes(3)
  view.cleanup()
})

it('should refresh repaired and expired dialogues', async () => {
  repairMocks.repairStoredDevFeedDialogues.mockResolvedValue(1)
  lifecycleMocks.deleteExpiredFeedDialogues.mockResolvedValue(1)
  const refreshDialogues = vi.fn(async () => undefined)
  const view = renderHook(() => usePFeeds({events: createEventContext(refreshDialogues)}))

  await vi.waitFor(() => expect(refreshDialogues).toHaveBeenCalledTimes(2))

  expect(lifecycleMocks.loadFeedDialogueList).toHaveBeenCalled()
  view.cleanup()
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

it('should reject repository actions before the hook is mounted', async () => {
  const dialogueRepository = repositoryMocks.dialogueRepository
  Object.defineProperty(repositoryMocks, 'dialogueRepository', {value: null, writable: true})
  const controller = usePFeeds({events: createEventContext()})

  await expect(controller.deleteRecovery()).rejects.toThrow(
    '피드 대화 저장소가 아직 준비되지 않았어요.',
  )
  Object.defineProperty(repositoryMocks, 'dialogueRepository', {
    value: dialogueRepository,
    writable: true,
  })
})

it('should remove scheduled jobs whose connections disappeared', async () => {
  const job = createJob()
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  lifecycleMocks.discardFeedJobs.mockResolvedValueOnce([]).mockResolvedValueOnce([job.id])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  queueMocks.scheduleFeedJobs.mockImplementation((queue, jobIds) => {
    queue.push(...jobIds.map((id: string) => ({allowModelDownload: false, id})))
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(queueMocks.scheduleFeedJobs).toHaveBeenCalled())

  await view.result.syncNow()

  expect(lifecycleMocks.discardFeedJobs).toHaveBeenLastCalledWith(
    expect.objectContaining({connectionIds: new Set(['feed-1'])}),
  )
  expect(repositoryMocks.feedRepository.listJobs).toHaveBeenCalled()
  view.cleanup()
})

it('should dispose a client whose model initialization fails', async () => {
  const job = createJob()
  const client = createVoiceClient({
    error: {code: 'model-not-ready', phase: 'generate', retryable: false},
    ok: false,
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(client)
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    const prepared = await options.prepareModel('int8')
    return prepared ? {job, status: 'ready'} : {job, status: 'model-preparation-failed'}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(client.dispose).toHaveBeenCalled())

  expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalled()
  view.cleanup()
})

it('should discard a connection-missing preparation', async () => {
  const job = createJob()
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async () => {
    repositoryMocks.listConnections.mockReturnValue([])
    return {status: 'connection-missing'}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.deleteJobs).toHaveBeenCalled())

  view.cleanup()
})

it('should fail generation when the stored feed item is missing', async () => {
  const job = createJob()
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(createVoiceClient())
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {audio: new Blob(), durationMs: 0, segments: []},
  })
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([])
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

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalled())

  expect(error).toHaveBeenCalledWith('Failed to process feed dialogue job.', expect.any(Error))
  expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalledWith(
    expect.objectContaining({errorMessage: '피드 대화를 저장하지 못했어요.'}),
    undefined,
  )
  view.cleanup()
})

it('should stop deferred generation cleanly after disposal', async () => {
  const job = createJob()
  const generation = Promise.withResolvers<{
    readonly message: string
    readonly ok: false
  }>()
  let chunk: ((completed: number, total: number) => void) | undefined
  const client = createVoiceClient()
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(client)
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockImplementation((options) => {
    chunk = options.onChunk
    return generation.promise
  })
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
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(feedGenerationRuntime.generateDialogueAudio).toHaveBeenCalled())

  view.cleanup()
  chunk?.(1, 1)
  generation.resolve({message: 'late failure', ok: false})
  await generation.promise

  expect(client.cancelGeneration).toHaveBeenCalled()
  expect(repositoryMocks.feedRepository.updateJob).not.toHaveBeenCalled()
})

it('should ignore a missing scheduled queue entry', async () => {
  const job = createJob()
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  queueMocks.scheduleFeedJobs.mockImplementationOnce((queue, _jobIds, run) => {
    queue.push(undefined)
    void run()
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(queueMocks.scheduleFeedJobs).toHaveBeenCalled())
  expect(queueMocks.processScheduledFeedJob).not.toHaveBeenCalled()
  view.cleanup()
})

it('should expose sync failures and create feed item ids', async () => {
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  syncMocks.synchronizeFeeds.mockImplementation(async (options) => {
    expect(options.createId()).toEqual(expect.any(String))
    return {failures: [{message: 'failed'}], queuedJobIds: [], successfulConnections: 0}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(view.result.state().status).toBe('error'))

  expect(view.result.state().message).toContain('1개 피드')
  view.cleanup()
})

it('should report unexpected synchronization and initialization failures', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  syncMocks.synchronizeFeeds.mockRejectedValueOnce(new Error('sync failed'))
  const syncView = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(syncView.result.state().message).toBe('피드를 확인하지 못했어요.'))
  expect(error).toHaveBeenCalledWith('Failed to synchronize focus room feeds.', expect.any(Error))
  syncView.cleanup()

  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockRejectedValueOnce(
    new Error('initialize failed'),
  )
  const initializeView = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() =>
    expect(initializeView.result.state().message).toBe('피드 기능을 시작하지 못했어요.'),
  )
  expect(error).toHaveBeenCalledWith('Failed to initialize focus room feeds.', expect.any(Error))
  initializeView.cleanup()
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

  expect(repositoryMocks.feedRepository.updateJob).not.toHaveBeenCalled()
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
