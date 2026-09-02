import {afterEach, beforeEach, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import type {SupertonicClient} from '../../supertonic'
import type {FeedDialogueJob, FeedItemRecord} from '../feed-dialogue-schema'
import type {FeedConnection} from '../schema'

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

export function getFeedTestMocks() {
  return {preparationMocks, queueMocks, repositoryMocks, syncMocks}
}

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
        run().catch(() => undefined)
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

export const createEventContext = (
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

export const createConnection = (overrides: Partial<FeedConnection> = {}): FeedConnection => ({
  createdAt: '2026-08-14T00:00:00.000Z',
  id: 'feed-1',
  updatedAt: '2026-08-14T00:00:00.000Z',
  url: 'https://example.com/feed.xml',
  version: 1,
  voiceId: 'Yuna',
  ...overrides,
})

export const createItem = (overrides: Partial<FeedItemRecord> = {}): FeedItemRecord => ({
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

export const createJob = (overrides: Partial<FeedDialogueJob> = {}): FeedDialogueJob => {
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

export const createVoiceClient = (
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
