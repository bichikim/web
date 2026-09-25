/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

import type {SupertonicClient} from 'src/features/supertonic'
import type {PFeedState} from '../features/focus-room-feed/feed-controller'
import type {FeedDialogueJob, FeedItemRecord} from '../features/focus-room-feed/feed-dialogue-schema'
import {
  createFeedGenerationController,
  type FeedGenerationDialogueRepository,
  type FeedGenerationRepository,
  type FeedGenerationRuntime,
} from '../features/focus-room-feed/generation-controller'
import type {FeedConnection} from '../features/focus-room-feed/schema'

const createConnection = (): FeedConnection => ({
  createdAt: '2026-08-14T00:00:00.000Z',
  id: 'feed-1',
  updatedAt: '2026-08-14T00:00:00.000Z',
  url: 'https://example.com/feed.xml',
  version: 1,
  voiceId: 'Yuna',
})

const createItem = (): FeedItemRecord => ({
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
})

const createJob = (): FeedDialogueJob => ({
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
  voiceId: 'Yuna',
})

const createVoiceClient = (): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn(),
  generateStream: vi.fn(),
  initialize: vi.fn(async () => ({ok: true, value: undefined})),
})

beforeEach(() => {
  vi.restoreAllMocks()
})

it('should not mark a feed job complete after cancellation begins during repository completion', async () => {
  const dialogueRepository = {
    deleteDialogue: vi.fn(async () => undefined),
    saveDialogue: vi.fn(async () => undefined),
  } satisfies FeedGenerationDialogueRepository
  const completion = Promise.withResolvers<void>()
  const feedRepository = {
    complete: vi.fn(() => completion.promise),
    deleteJobs: vi.fn(async () => undefined),
    failJob: vi.fn(async () => true),
    interruptUnfinishedJobs: vi.fn(async () => [{...createJob(), status: 'interrupted' as const}]),
    listItems: vi.fn(async () => [createItem()]),
    listJobs: vi.fn(async () => [createJob()]),
    startJob: vi.fn(async () => true),
  } satisfies FeedGenerationRepository
  const voiceClient = createVoiceClient()
  const runtime = {
    createVoiceClient: vi.fn(async () => voiceClient),
    generateDialogueAudio: vi.fn(async () => ({
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
  let state: PFeedState = {message: '대기 중', status: 'idle'}
  const controller = createFeedGenerationController({
    createId: () => 'dialogue-1',
    dialogueRepository,
    feedRepository,
    getConnections: () => [createConnection()],
    getState: () => state,
    isRecoveryDismissed: () => false,
    now: () => new Date('2026-08-14T00:00:00.000Z'),
    onCompleted,
    onDiscarded: vi.fn(async () => undefined),
    onFailed: vi.fn(async () => undefined),
    onRecovery: vi.fn(),
    resolveGenerationSettings: async () => ({modelId: 'int8', voiceId: 'Yuna'}),
    runtime,
    setState: (nextState) => {
      state = nextState
    },
  })

  controller.schedule({jobIds: ['job-1']})
  await vi.waitFor(() => expect(dialogueRepository.saveDialogue).toHaveBeenCalledOnce())

  await controller.cancel()
  completion.resolve()
  await vi.waitFor(() => expect(feedRepository.complete).toHaveBeenCalledOnce())

  expect(onCompleted).not.toHaveBeenCalled()
  expect(dialogueRepository.deleteDialogue).toHaveBeenCalledOnce()
})
