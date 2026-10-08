/** @vitest-environment jsdom */

import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'

import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import type {FeedDialogueListItem, PFeedController} from 'src/features/focus-room-feed'
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
  expect(dialogueList).toHaveClass('[&_>_li]:border-content-border', '[&_>_li]:bg-content-surface')
})

it('should require confirmation before deleting a feed dialogue', async () => {
  const {controller, onDeleteDialogue} = createController()
  render(() => <PFeedDialogueList controller={controller} />)

  fireEvent.click(screen.getByRole('button', {name: '새 피드 소식 피드 대화 삭제'}))

  expect(onDeleteDialogue).not.toHaveBeenCalled()
  expect(screen.getByRole('button', {name: '취소'})).toBeDefined()
  const deleteConfirmation = screen.getByRole('button', {
    name: '새 피드 소식 피드 대화 삭제 확인',
  })
  expect(deleteConfirmation.parentElement?.className).toContain(
    '[&_[data-pomo-feed-delete-confirm]]:text-danger',
  )
  fireEvent.click(deleteConfirmation)

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

it('should use singular English copy for one remaining dialogue and one cleanup hour', () => {
  overwriteGetLocale(() => 'en')
  vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-08-16T00:00:00.000Z'))
  const dialogues = Array.from({length: 21}, (_, index) => ({
    ...FEED_DIALOGUE,
    dialogue: {...FEED_DIALOGUE.dialogue, id: `dialogue-${index}`},
    metadata: {
      ...FEED_DIALOGUE.metadata,
      dialogueId: `dialogue-${index}`,
      expiresAt: '2026-08-16T01:00:00.000Z',
      feedItemId: `item-${index}`,
      itemTitle: `Feed update ${index}`,
    },
  }))
  const {controller} = createController(dialogues)

  render(() => <PFeedDialogueList controller={controller} />)

  expect(screen.getAllByText(/Clean up in 1 hour/u)).toHaveLength(20)
  expect(screen.getByRole('button', {name: 'Show 1 earlier feed dialogue'})).toBeDefined()
})

it('should show truthful cleanup copy at expiry and minute-hour boundaries', () => {
  overwriteGetLocale(() => 'en')
  const now = Date.parse('2026-08-16T00:00:00.000Z')
  vi.spyOn(Date, 'now').mockReturnValue(now)
  const countdowns = [
    {expiresAt: new Date(now - 1).toISOString(), itemTitle: 'Expired feed update'},
    {expiresAt: new Date(now).toISOString(), itemTitle: 'Zero-minute feed update'},
    {expiresAt: new Date(now + 60_000).toISOString(), itemTitle: 'One-minute feed update'},
    {
      expiresAt: new Date(now + 59 * 60_000).toISOString(),
      itemTitle: 'Fifty-nine-minute feed update',
    },
    {expiresAt: new Date(now + 60 * 60_000).toISOString(), itemTitle: 'One-hour feed update'},
    {
      expiresAt: new Date(now + 61 * 60_000).toISOString(),
      itemTitle: 'Sixty-one-minute feed update',
    },
  ]
  const dialogues = countdowns.map(({expiresAt, itemTitle}, index) => ({
    ...FEED_DIALOGUE,
    dialogue: {...FEED_DIALOGUE.dialogue, id: `dialogue-${index}`},
    metadata: {
      ...FEED_DIALOGUE.metadata,
      dialogueId: `dialogue-${index}`,
      expiresAt,
      feedItemId: `item-${index}`,
      itemTitle,
    },
  }))
  const {controller} = createController(dialogues)

  render(() => <PFeedDialogueList controller={controller} />)

  const cleanupTextFor = (itemTitle: string) =>
    screen.getByText(itemTitle).closest('li')?.querySelector('small')?.textContent ?? ''

  expect(cleanupTextFor('Expired feed update')).toContain('Clean up on the next check')
  expect(cleanupTextFor('Zero-minute feed update')).toContain('Clean up on the next check')
  expect(cleanupTextFor('One-minute feed update')).toContain('Clean up in 1 minute')
  expect(cleanupTextFor('Fifty-nine-minute feed update')).toContain('Clean up in 59 minutes')
  expect(cleanupTextFor('One-hour feed update')).toContain('Clean up in 1 hour')
  expect(cleanupTextFor('Sixty-one-minute feed update')).toContain('Clean up in 2 hours')
})

it('should update cleanup copy after time advances without remounting the dialogue row', () => {
  const startingNow = Date.parse('2026-08-16T00:00:00.000Z')
  let now = startingNow
  vi.spyOn(Date, 'now').mockImplementation(() => now)
  const dialogue = {
    ...FEED_DIALOGUE,
    metadata: {
      ...FEED_DIALOGUE.metadata,
      expiresAt: new Date(startingNow + 60 * 60_000).toISOString(),
      itemTitle: 'Changing feed update',
    },
  }
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FeedDialogueListItem>>([dialogue])
  const {controller: baseController} = createController()
  const controller: PFeedController = {...baseController, dialogues}

  render(() => <PFeedDialogueList controller={controller} />)

  const row = screen.getByText('Changing feed update').closest('li')
  expect(row?.querySelector('small')?.textContent).toContain('1시간 후 정리')

  now += 60_000
  setDialogues((current) => current.map((item) => ({...item})))

  expect(screen.getByText('Changing feed update').closest('li')).toBe(row)
  expect(row?.querySelector('small')?.textContent).toContain('59분 후 정리')

  now += 58 * 60_000
  setDialogues((current) => current.map((item) => ({...item})))

  expect(screen.getByText('Changing feed update').closest('li')).toBe(row)
  expect(row?.querySelector('small')?.textContent).toContain('1분 후 정리')
})

it('should apply compact spacing to feed dialogue rows', () => {
  const {controller} = createController()
  render(() => <PFeedDialogueList controller={controller} />)
  const list = screen.getByRole('list', {name: '피드 대화'})

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

  expect(screen.getByText(/아직 완성된 피드 대화가 없어요/u)).toHaveClass('bg-content-surface')
  expect(screen.getByText('읽지 못한 소식')).toBeDefined()
  expect(screen.getByText('읽을 수 있는 원문을 가져오지 못했어요.')).toBeDefined()
  expect(screen.getByRole('link', {name: '원문 보기'})).toHaveAttribute(
    'href',
    'https://example.com/issue',
  )
  fireEvent.click(screen.getByRole('button', {name: '지금 확인'}))
  expect(controller.syncNow).toHaveBeenCalledOnce()
})

it('should preserve the feed dialogue control and focus when listened metadata changes', () => {
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FeedDialogueListItem>>([
    FEED_DIALOGUE,
  ])
  const {controller: base} = createController()
  render(() => <PFeedDialogueList controller={{...base, dialogues}} />)
  const button = screen.getByRole('button', {name: '듣기'})
  button.focus()
  expect(document.activeElement).toBe(button)
  setDialogues([
    {
      ...FEED_DIALOGUE,
      metadata: {...FEED_DIALOGUE.metadata, listenedAt: '2026-08-14T01:00:00.000Z'},
    },
  ])
  const nextButton = screen.getByRole('button', {name: '다시 듣기'})
  expect(nextButton).toBe(button)
  expect(button.isConnected).toBe(true)
  expect(document.activeElement).toBe(nextButton)
})
