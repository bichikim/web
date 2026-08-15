/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import {
  type FeedDialogueListItem,
  type PFeedController,
  usePFeedContext,
} from '../../features/focus-room-feed'
import {PFeedStatus} from '../PFeedStatus'

vi.mock('../../features/focus-room-feed', () => ({
  usePFeedContext: vi.fn(),
}))

const READY_DIALOGUE: FeedDialogueListItem = {
  dialogue: {
    audioKey: 'audio-1',
    createdAt: '2026-08-14T00:00:00.000Z',
    durationMs: 1000,
    id: 'dialogue-1',
    modelId: 'full',
    segments: [{durationMs: 1000, index: 0, startMs: 0, text: '새 피드'}],
    text: '새 피드',
    updatedAt: '2026-08-14T00:00:00.000Z',
    version: 1,
    voiceId: 'Yuna',
  },
  metadata: {
    createdAt: '2026-08-14T00:00:00.000Z',
    dialogueId: 'dialogue-1',
    expiresAt: '2026-08-16T00:00:00.000Z',
    feedConnectionId: 'feed-1',
    feedItemId: 'item-1',
    itemTitle: '새로운 소식',
    listenedAt: null,
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: '테스트 피드',
    sourceUrl: 'https://example.com/article',
    version: 1,
  },
}

const createFeeds = (
  dialogues: ReadonlyArray<FeedDialogueListItem> = [READY_DIALOGUE],
  isListening = false,
): PFeedController => ({
  deleteRecovery: vi.fn(async () => undefined),
  dialogues: () => dialogues,
  dismissRecovery: vi.fn(),
  isListening: () => isListening,
  issues: () => [],
  latestReady: () => dialogues[0] ?? null,
  listen: vi.fn(async () => undefined),
  listenAll: vi.fn(async () => undefined),
  onDeleteDialogue: vi.fn(async () => undefined),
  recoveryJobs: () => [],
  retryRecovery: vi.fn(async () => undefined),
  state: () => ({message: '대기 중', status: 'idle'}),
  syncNow: vi.fn(async () => undefined),
  unlistenedDialogues: () => dialogues,
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should show a ready feed notice', () => {
  vi.mocked(usePFeedContext).mockReturnValue(createFeeds())

  render(() => <PFeedStatus />)

  expect(screen.getByText('새 피드 대화가 준비됐어요')).toBeDefined()
})

it('should play all accumulated feed dialogues with one action', () => {
  const olderDialogue = {
    ...READY_DIALOGUE,
    dialogue: {...READY_DIALOGUE.dialogue, id: 'dialogue-2'},
    metadata: {
      ...READY_DIALOGUE.metadata,
      dialogueId: 'dialogue-2',
      feedItemId: 'item-2',
      itemTitle: '이전 소식',
    },
  }
  const feeds = createFeeds([READY_DIALOGUE, olderDialogue])
  vi.mocked(usePFeedContext).mockReturnValue(feeds)

  render(() => <PFeedStatus />)

  expect(screen.getByText('새 피드 대화 2개가 준비됐어요')).toBeDefined()
  fireEvent.click(screen.getByRole('button', {name: '연속 듣기'}))
  expect(feeds.listenAll).toHaveBeenCalledOnce()
})

it('should hide the ready notice while queued dialogues are playing', () => {
  vi.mocked(usePFeedContext).mockReturnValue(createFeeds([READY_DIALOGUE], true))

  render(() => <PFeedStatus />)

  expect(screen.queryByText('새 피드 대화가 준비됐어요')).toBeNull()
})
