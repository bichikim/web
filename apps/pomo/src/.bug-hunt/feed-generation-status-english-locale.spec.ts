/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {useFeedProgress} from '../components/feed-status/use-feed-progress'
import type {PFeedController, PFeedState} from '../features/focus-room-feed/feed-controller'
import {
  createFeedGenerationController,
  type FeedGenerationDialogueRepository,
  type FeedGenerationRepository,
  type FeedGenerationRuntime,
} from '../features/focus-room-feed/generation-controller'
import type {FeedConnection} from '../features/focus-room-feed/schema'
import type {
  FeedDialogueJob,
  FeedItemRecord,
} from '../features/focus-room-feed/feed-dialogue-schema'
import type {SupertonicClient} from '../features/supertonic'

const originalGetLocale = getLocale

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

const createGenerationControllerFixture = () => {
  const dialogueRepository = {
    deleteDialogue: vi.fn(async () => undefined),
    saveDialogue: vi.fn(async () => undefined),
  } satisfies FeedGenerationDialogueRepository
  const feedRepository = {
    complete: vi.fn(async () => undefined),
    deleteJobs: vi.fn(async () => undefined),
    failJob: vi.fn(async () => true),
    interruptUnfinishedJobs: vi.fn(async () => []),
    listItems: vi.fn(async () => [createItem()]),
    listJobs: vi.fn(async () => [createJob()]),
    startJob: vi.fn(async () => true),
  } satisfies FeedGenerationRepository
  const voiceClient = createVoiceClient()
  const runtime = {
    createVoiceClient: vi.fn(async () => voiceClient),
    generateDialogueAudio: vi.fn(async () => new Promise(() => undefined)),
    isModelDownloaded: vi.fn(async () => true),
  } satisfies FeedGenerationRuntime
  let state: PFeedState = {message: '대기 중', status: 'idle'}
  const setState = vi.fn((nextState: PFeedState) => {
    state = nextState
  })
  const controller = createFeedGenerationController({
    createId: () => 'dialogue-1',
    dialogueRepository,
    feedRepository,
    getConnections: () => [createConnection()],
    getState: () => state,
    isRecoveryDismissed: () => false,
    now: () => new Date('2026-08-14T00:00:00.000Z'),
    onCompleted: vi.fn(async () => undefined),
    onDiscarded: vi.fn(async () => undefined),
    onFailed: vi.fn(async () => undefined),
    onRecovery: vi.fn(),
    resolveGenerationSettings: async () => ({modelId: 'int8', voiceId: 'Yuna'}),
    runtime,
    setState,
  })

  return {controller, runtime, setState}
}

const createFeedController = (state: PFeedState): PFeedController => ({
  cancelProcessing: async () => undefined,
  dialogues: () => [],
  dismissRecovery: () => undefined,
  deleteRecovery: async () => undefined,
  isListening: () => false,
  latestReady: () => null,
  listen: async () => undefined,
  listenAll: async () => undefined,
  onDeleteDialogue: async () => undefined,
  issues: () => [],
  recoveryJobs: () => [],
  retryRecovery: async () => undefined,
  state: () => state,
  syncNow: async () => undefined,
  unlistenedDialogues: () => [],
})

describe('feed generation progress localization', () => {
  beforeEach(() => {
    overwriteGetLocale(() => 'en')
  })

  afterEach(() => {
    overwriteGetLocale(originalGetLocale)
    vi.restoreAllMocks()
  })

  it('should not expose Korean-only generation templates from the generation controller', async () => {
    const fixture = createGenerationControllerFixture()
    fixture.controller.schedule({jobIds: ['job-1']})

    await vi.waitFor(() =>
      expect(fixture.setState).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '새 피드 음성을 만들고 있어요.',
          status: 'generating',
        }),
      ),
    )

    expect(fixture.setState.mock.calls.at(-1)?.[0].message).not.toContain('음성을 만들고 있어요')
  })

  it('should localize generation progress for the feed status card when locale is English', () => {
    const download = {
      cancel: vi.fn(),
      state: () => ({status: 'idle' as const}),
    }
    const {result} = renderHook(() =>
      useFeedProgress(
        () =>
          createFeedController({
            message: '새 피드 · 1/2 구간 생성 중',
            progress: 50,
            status: 'generating',
          }),
        download as never,
      ),
    )

    expect(result.progress()?.message).not.toContain('구간 생성 중')
  })
})
