/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {FeedDialogueListItem, PFeedController} from 'src/features/focus-room-feed'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import {PFeedDialogueList} from '../DialogueList'

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
    cancelProcessing: vi.fn(async () => undefined),
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

const originalGetLocale = getLocale

beforeEach(() => {
  overwriteGetLocale(() => 'ko')
})

afterEach(() => {
  overwriteGetLocale(originalGetLocale)
  vi.restoreAllMocks()
})

it('should render feed dialogue controls in English', () => {
  overwriteGetLocale(() => 'en')
  const {controller} = createController()
  render(() => <PFeedDialogueList controller={controller} />)

  expect(screen.getByRole('heading', {name: 'Feed dialogues'})).toBeDefined()
  expect(screen.getByRole('button', {name: 'Check now'})).toBeDefined()
  expect(screen.getByText('Not listened')).toBeDefined()
  expect(screen.getByRole('button', {name: 'Listen'})).toBeDefined()
})

it('should localize persisted feed issues for the current language', () => {
  overwriteGetLocale(() => 'en')
  const issue = {
    contentLength: 0,
    discoveredAt: '2026-08-14T00:00:00.000Z',
    feedConnectionId: 'feed-1',
    feedItemId: 'issue-1',
    id: 'feed-1\u0000issue-1',
    itemTitle: 'Unreadable article',
    message: '읽을 수 있는 원문이 없어요.',
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: 'Test feed',
    sourceUrl: 'https://example.com/issue',
    status: 'failed',
    updatedAt: '2026-08-14T00:00:00.000Z',
    version: 1,
  } as const
  const {controller: baseController} = createController([])
  const controller: PFeedController = {...baseController, issues: () => [issue]}

  render(() => <PFeedDialogueList controller={controller} />)

  expect(screen.getByText("Couldn't read the source text.")).toBeDefined()
  expect(screen.queryByText('읽을 수 있는 원문이 없어요.')).toBeNull()
})

it('should omit source links from saved feed dialogue items', () => {
  const {controller} = createController()
  render(() => <PFeedDialogueList controller={controller} />)

  const dialogueList = screen.getByRole('list', {name: '피드 대화'})
  expect(within(dialogueList).queryByRole('link')).toBeNull()
})

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

it('should apply compact spacing to feed dialogue rows', () => {
  const {controller} = createController()
  const result = render(() => <PFeedDialogueList controller={controller} />)
  const list = result.container.querySelector('.pomo-feed-settings__dialogue-list') as HTMLElement

  expect(list.classList.contains('settings-compact:gap-2')).toBe(true)
  expect(list.classList.contains('settings-compact:[&_>_li]:gap-2')).toBe(true)
})

it('should report a saved dialogue playback failure and show its future cleanup time', async () => {
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-14T00:00:00.000Z'))
  const dialogue = {
    ...FEED_DIALOGUE,
    metadata: {...FEED_DIALOGUE.metadata, expiresAt: '2026-08-14T02:00:00.000Z'},
  }
  const {controller} = createController([dialogue])
  const playbackError = new Error('playback failed')
  vi.mocked(controller.listen).mockRejectedValueOnce(playbackError)
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  render(() => <PFeedDialogueList controller={controller} />)
  fireEvent.click(screen.getByRole('button', {name: '듣기'}))

  expect(screen.getByText(/2시간 후 정리/u)).toBeDefined()
  await waitFor(() => {
    expect(consoleError).toHaveBeenCalledWith('Failed to play saved feed dialogue.', playbackError)
  })
  expect(controller.listen).toHaveBeenCalledWith('dialogue-1')
})

it('should preserve deletion confirmation and show an error when deletion fails', async () => {
  const {controller, onDeleteDialogue} = createController()
  const deletionError = new Error('deletion failed')
  onDeleteDialogue.mockRejectedValueOnce(deletionError)
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

  render(() => <PFeedDialogueList controller={controller} />)
  fireEvent.click(screen.getByRole('button', {name: '새 피드 소식 피드 대화 삭제'}))
  fireEvent.click(screen.getByRole('button', {name: '새 피드 소식 피드 대화 삭제 확인'}))

  expect(await screen.findByRole('status')).toHaveTextContent('피드 대화를 삭제하지 못했어요.')
  expect(screen.getByRole('button', {name: '새 피드 소식 피드 대화 삭제 확인'})).toBeDefined()
  expect(consoleError).toHaveBeenCalledWith('Failed to delete saved feed dialogue.', deletionError)
})

it('should show an empty dialogue state, refresh feeds, and list unreadable items', () => {
  const issue = {
    contentLength: 0,
    discoveredAt: '2026-08-14T00:00:00.000Z',
    feedConnectionId: 'feed-1',
    feedItemId: 'issue-1',
    id: 'feed-1\u0000issue-1',
    itemTitle: '읽지 못한 소식',
    message: '본문을 가져오지 못했어요.',
    publishedAt: '2026-08-14T00:00:00.000Z',
    sourceTitle: '테스트 피드',
    sourceUrl: 'https://example.com/issue',
    status: 'failed',
    updatedAt: '2026-08-14T00:00:00.000Z',
    version: 1,
  } as const
  const {controller: baseController} = createController([])
  const controller: PFeedController = {...baseController, issues: () => [issue]}

  render(() => <PFeedDialogueList controller={controller} />)

  expect(screen.getByText(/아직 완성된 피드 대화가 없어요/u)).toBeDefined()
  expect(screen.getByText('읽지 못한 소식')).toBeDefined()
  expect(screen.getByText('읽을 수 있는 원문을 가져오지 못했어요.')).toBeDefined()
  expect(screen.getByRole('link', {name: '원문 보기'})).toHaveAttribute(
    'href',
    'https://example.com/issue',
  )
  fireEvent.click(screen.getByRole('button', {name: '지금 확인'}))
  expect(controller.syncNow).toHaveBeenCalledOnce()
})
