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
    recoverMissingDialogue: vi.fn().mockResolvedValue(true),
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
  repositoryMocks.feedRepository.recoverMissingDialogue.mockResolvedValue(true)
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

it('should mark an unlistened dialogue when individual playback starts', async () => {
  const available = [createDialogue('new', null), createDialogue('old', '2026-08-14T01:00:00Z')]
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue(available)
  const events = createEventContext()
  vi.mocked(events.playDialogueSequence).mockImplementation(async (options) => {
    await options.onDialogueStart?.(options.dialogueIds[0] as string)
  })
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.dialogues()).toEqual(available))

  await view.result.listen('new')
  await view.result.listen('old')

  expect(repositoryMocks.feedRepository.markListened).toHaveBeenCalledOnce()
  expect(view.result.dialogues()[0]?.metadata.listenedAt).not.toBeNull()
  expect(
    vi.mocked(events.playDialogueSequence).mock.calls.map(([options]) => options.dialogueIds),
  ).toEqual([['new'], ['old']])
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

it('should regenerate unavailable feed audio instead of repeating the ready notice', async () => {
  const available = [createDialogue('missing', null)]
  const storedItem = createItem({
    feedItemId: 'item-missing',
    id: 'feed-1\0item-missing',
    status: 'ready',
  })
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue(available)
  repositoryMocks.feedRepository.listItems.mockResolvedValue([storedItem])
  const events = createEventContext()
  vi.mocked(events.playDialogueSequence).mockImplementation(async (options) => {
    await options.onDialogueUnavailable?.('missing')
  })
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.dialogues()).toEqual(available))

  await view.result.listenAll()

  const recovery = repositoryMocks.feedRepository.recoverMissingDialogue.mock.calls[0]?.[0]
  expect(recovery).toMatchObject({
    dialogueId: 'missing',
    item: {
      feedConnectionId: 'feed-1',
      feedItemId: 'item-missing',
      status: 'queued',
    },
    job: {
      feedConnectionId: 'feed-1',
      feedItemId: 'item-missing',
      modelId: 'full',
      script: '안녕하세요',
      status: 'queued',
      voiceId: 'Yuna',
    },
  })
  expect(view.result.unlistenedDialogues()).toEqual([])
  expect(repositoryMocks.feedRepository.markListened).not.toHaveBeenCalled()
  expect(queueMocks.scheduleFeedJobs).toHaveBeenCalledWith(
    expect.any(Array),
    [recovery?.job.id],
    expect.any(Function),
    false,
  )
  expect(events.deleteDialogue).toHaveBeenCalledWith('missing')
  view.cleanup()
})

it('should discard stale local feed state when another request owns audio recovery', async () => {
  const available = [createDialogue('missing', null)]
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue(available)
  repositoryMocks.feedRepository.recoverMissingDialogue.mockResolvedValue(false)
  const events = createEventContext()
  vi.mocked(events.playDialogueSequence).mockImplementation(async (options) => {
    await options.onDialogueUnavailable?.('missing')
  })
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.dialogues()).toEqual(available))

  await view.result.listenAll()

  expect(view.result.unlistenedDialogues()).toEqual([])
  expect(queueMocks.scheduleFeedJobs).not.toHaveBeenCalled()
  expect(events.deleteDialogue).toHaveBeenCalledWith('missing')
  view.cleanup()
})

it('should ignore an unavailable callback for a dialogue outside the current feed list', async () => {
  const available = [createDialogue('available', null)]
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue(available)
  const events = createEventContext()
  vi.mocked(events.playDialogueSequence).mockImplementation(async (options) => {
    await options.onDialogueUnavailable?.('unknown')
  })
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.dialogues()).toEqual(available))

  await view.result.listenAll()

  expect(repositoryMocks.feedRepository.recoverMissingDialogue).not.toHaveBeenCalled()
  expect(view.result.unlistenedDialogues()).toEqual(available)
  expect(events.deleteDialogue).not.toHaveBeenCalled()
  view.cleanup()
})

it('should leave recovered persistence for the next mount when disposed during recovery', async () => {
  const available = [createDialogue('missing', null)]
  const recovery = Promise.withResolvers<boolean>()
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue(available)
  repositoryMocks.feedRepository.recoverMissingDialogue.mockReturnValue(recovery.promise)
  const events = createEventContext()
  vi.mocked(events.playDialogueSequence).mockImplementation(async (options) => {
    await options.onDialogueUnavailable?.('missing')
  })
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.dialogues()).toEqual(available))

  const listening = view.result.listenAll()
  await vi.waitFor(() =>
    expect(repositoryMocks.feedRepository.recoverMissingDialogue).toHaveBeenCalledOnce(),
  )
  view.cleanup()
  recovery.resolve(true)
  await listening

  expect(queueMocks.scheduleFeedJobs).not.toHaveBeenCalled()
  expect(events.deleteDialogue).not.toHaveBeenCalled()
})

it('should skip listening to an empty feed batch', async () => {
  const events = createEventContext()
  const view = renderHook(() => usePFeeds({events}))
  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))

  await view.result.listenAll()

  expect(events.playDialogueSequence).not.toHaveBeenCalled()
  view.cleanup()
})

it('should ignore a recovery retry when no jobs remain', async () => {
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))
  const initialState = view.result.state()

  await view.result.retryRecovery()

  expect(repositoryMocks.feedRepository.retryJobs).not.toHaveBeenCalled()
  expect(queueMocks.scheduleFeedJobs).not.toHaveBeenCalled()
  expect(view.result.state()).toEqual(initialState)
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

it('should expose preparation while recovered jobs wait for the generation queue', async () => {
  const jobs = [createJob({id: 'failed', status: 'failed'})]
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue(jobs)
  queueMocks.scheduleFeedJobs.mockImplementationOnce(() => undefined)
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(view.result.recoveryJobs()).toEqual(jobs))

  await view.result.retryRecovery()

  expect(view.result.state()).toEqual({
    message: '피드 대화를 다시 만들 준비 중…',
    progress: 0,
    status: 'preparing',
  })
  view.cleanup()
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
