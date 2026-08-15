/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import type {FeedDialogueListItem, PFeedController} from 'src/features/focus-room-feed'
import {PFeedDialogueList} from '../PFeedDialogueList'

const FEED_DIALOGUE: FeedDialogueListItem = {
  dialogue: {
    audioKey: 'audio-1',
    createdAt: '2026-08-14T00:00:00.000Z',
    durationMs: 1000,
    id: 'dialogue-1',
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
    dialogueId: 'dialogue-1',
    expiresAt: '2026-08-16T00:00:00.000Z',
    feedConnectionId: 'feed-1',
    feedItemId: 'item-1',
    itemTitle: '새 피드 소식',
    listenedAt: null,
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: '테스트 피드',
    sourceUrl: 'https://example.com/article',
    version: 1,
  },
}

const createController = (dialogues: ReadonlyArray<FeedDialogueListItem> = [FEED_DIALOGUE]) => {
  const onDeleteDialogue = vi.fn(async () => undefined)
  const controller: PFeedController = {
    deleteRecovery: vi.fn(async () => undefined),
    dialogues: () => dialogues,
    dismissRecovery: vi.fn(),
    isListening: () => false,
    issues: () => [],
    latestReady: () => null,
    listen: vi.fn(async () => undefined),
    listenAll: vi.fn(async () => undefined),
    onDeleteDialogue,
    recoveryJobs: () => [],
    retryRecovery: vi.fn(async () => undefined),
    state: () => ({message: '대기 중', status: 'idle'}),
    syncNow: vi.fn(async () => undefined),
    unlistenedDialogues: () => dialogues.filter((item) => item.metadata.listenedAt === null),
  }
  return {controller, onDeleteDialogue}
}

it('should require confirmation before deleting a feed dialogue', async () => {
  const {controller, onDeleteDialogue} = createController()
  render(() => <PFeedDialogueList controller={controller} />)

  fireEvent.click(screen.getByRole('button', {name: '새 피드 소식 피드 대화 삭제'}))

  expect(onDeleteDialogue).not.toHaveBeenCalled()
  expect(screen.getByRole('button', {name: '취소'})).toBeDefined()
  fireEvent.click(screen.getByRole('button', {name: '새 피드 소식 피드 대화 삭제 확인'}))

  await waitFor(() => expect(onDeleteDialogue).toHaveBeenCalledWith('dialogue-1'))
})

it('should cancel feed dialogue deletion', () => {
  const {controller, onDeleteDialogue} = createController()
  render(() => <PFeedDialogueList controller={controller} />)

  fireEvent.click(screen.getByRole('button', {name: '새 피드 소식 피드 대화 삭제'}))
  fireEvent.click(screen.getByRole('button', {name: '취소'}))

  expect(onDeleteDialogue).not.toHaveBeenCalled()
  expect(screen.getByRole('button', {name: '새 피드 소식 피드 대화 삭제'})).toBeDefined()
})

it('should distinguish listened feed dialogues from unlistened dialogues', () => {
  const listenedDialogue = {
    ...FEED_DIALOGUE,
    metadata: {...FEED_DIALOGUE.metadata, listenedAt: '2026-08-14T01:00:00.000Z'},
  }
  const {controller} = createController([listenedDialogue])
  render(() => <PFeedDialogueList controller={controller} />)

  expect(screen.getByText('들음', {exact: true})).toBeDefined()
  expect(screen.getByRole('button', {name: '다시 듣기'})).toBeDefined()
})

it('should render saved feed dialogues in bounded pages', () => {
  const dialogues = Array.from({length: 21}, (_, index) => ({
    ...FEED_DIALOGUE,
    dialogue: {...FEED_DIALOGUE.dialogue, id: `dialogue-${index}`},
    metadata: {
      ...FEED_DIALOGUE.metadata,
      dialogueId: `dialogue-${index}`,
      feedItemId: `item-${index}`,
      itemTitle: `피드 소식 ${index}`,
    },
  }))
  const {controller} = createController(dialogues)
  render(() => <PFeedDialogueList controller={controller} />)

  expect(screen.getAllByRole('button', {name: '듣기'})).toHaveLength(20)
  fireEvent.click(screen.getByRole('button', {name: '이전 피드 대화 1개 더 보기'}))
  expect(screen.getAllByRole('button', {name: '듣기'})).toHaveLength(21)
})
