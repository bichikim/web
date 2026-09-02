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
  deleteDialogueAudio: vi.fn(),
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
  const jobStart = Promise.withResolvers<boolean>()
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
  repositoryMocks.feedRepository.startJob.mockImplementationOnce(() => jobStart.promise)
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    const didStart = await options.repository.startJob({
      ...options.job,
      status: 'generating',
      updatedAt: options.now(),
    })

    if (!didStart) {
      return {status: 'job-not-queued'}
    }

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

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.startJob).toHaveBeenCalledOnce())
  repositoryMocks.listConnections.mockReturnValue([
    {...initialConnection, updatedAt: '2026-08-14T00:02:00.000Z', voiceId: 'M2'},
  ])
  window.dispatchEvent(new CustomEvent(FEED_CONNECTIONS_CHANGED_EVENT))
  jobStart.resolve(true)

  await vi.waitFor(() => expect(generateDialogueAudio).toHaveBeenCalledOnce())
  const generationOptions = generateDialogueAudio.mock.calls[0]?.[0]
  view.cleanup()

  expect(generationOptions).toMatchObject({modelId: 'int8', voiceId: 'M2'})
})
