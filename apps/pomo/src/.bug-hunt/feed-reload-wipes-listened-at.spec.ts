/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import type {PDialogue} from '../features/focus-room-dialogue'
import type {FeedDialogueListItem} from '../features/focus-room-feed/feed-controller'
import {createFeedStateController} from '../features/focus-room-feed/feed-state'
import type {FeedDialogueMetadata} from '../features/focus-room-feed/feed-dialogue-schema'

const lifecycleMocks = vi.hoisted(() => ({
  loadFeedDialogueList: vi.fn(),
}))

vi.mock('../features/focus-room-feed/feed-dialogue-lifecycle', () => ({
  deleteExpiredFeedDialogues: vi.fn(),
  discardFeedJobs: vi.fn(),
  loadFeedDialogueList: lifecycleMocks.loadFeedDialogueList,
  loadFeedIssues: vi.fn(),
}))

const DIALOGUE: PDialogue = {
  audioKey: 'audio-1',
  createdAt: '2026-08-14T00:00:00.000Z',
  durationMs: 1000,
  id: 'dialogue-1',
  language: 'ko',
  modelId: 'int8',
  segments: [{durationMs: 1000, index: 0, startMs: 0, text: '안녕하세요'}],
  text: '안녕하세요',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

const createListItem = (listenedAt: string | null): FeedDialogueListItem => {
  const metadata: FeedDialogueMetadata = {
    createdAt: '2026-08-14T00:00:00.000Z',
    dialogueId: DIALOGUE.id,
    expiresAt: '2026-08-16T00:00:00.000Z',
    feedConnectionId: 'feed-1',
    feedItemId: 'item-1',
    itemTitle: '새 피드',
    listenedAt,
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: '테스트 피드',
    sourceUrl: 'https://example.com/dialogue-1',
    version: 1,
  }

  return {dialogue: DIALOGUE, metadata}
}

const createController = () =>
  createFeedStateController({
    events: {
      deleteDialogue: vi.fn(async () => undefined),
      isDialogueScheduled: vi.fn(() => false),
      refreshDialogues: vi.fn(async () => undefined),
    },
    getRepositories: () => ({
      dialogueRepository: {getDialogue: vi.fn()},
      feedRepository: {listMetadata: vi.fn(), removeItem: vi.fn(), removeMetadata: vi.fn()},
    }),
    listConnections: () => [],
    now: () => new Date('2026-08-14T01:00:00.000Z'),
  })

it('should keep in-memory listenedAt when reload returns a stale metadata snapshot', async () => {
  const listenedAt = '2026-08-14T01:00:00.000Z'
  const listenedItem = createListItem(listenedAt)
  const staleItem = createListItem(null)
  lifecycleMocks.loadFeedDialogueList.mockResolvedValue([staleItem])

  const controller = createController()
  controller.setDialogues([listenedItem])

  await controller.reloadDialogues()

  expect(controller.dialogues()[0]?.metadata.listenedAt).toBe(listenedAt)
})
