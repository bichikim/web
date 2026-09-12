import {createSignal} from 'solid-js'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {usePFeedContext} from 'src/features/focus-room-feed'
import {useModelDownload} from 'src/features/model-download'
import {PFeedStatus} from '../PFeedStatus'
import {
  createFeeds,
  createModelDownload,
  READY_DIALOGUE,
  RECOVERY_JOB,
} from './feed-status/fixtures'

vi.mock('src/features/focus-room-feed', () => ({
  usePFeedContext: vi.fn(),
}))

vi.mock('src/features/model-download', () => ({
  useModelDownload: vi.fn(),
}))

vi.mock('src/components/PModal', () => ({PModal: vi.fn()}))

vi.mock('src/features/supertonic', async () => {
  const actual: typeof import('src/features/supertonic') =
    await vi.importActual('src/features/supertonic')
  return {...actual, isSupertonicModelDownloaded: vi.fn()}
})

beforeEach(() => {
  vi.mocked(useModelDownload).mockReturnValue(createModelDownload())
})

afterEach(() => {
  vi.clearAllMocks()
})

it('should show a ready feed notice', () => {
  const feeds = createFeeds()
  vi.mocked(usePFeedContext).mockReturnValue(feeds)

  const originalResult = render(() => <PFeedStatus />)

  expect(screen.getByText('새 피드 대화가 준비됐어요')).toBeDefined()
  expect(feeds.listen).not.toHaveBeenCalled()
  expect(feeds.listenAll).not.toHaveBeenCalled()
  expect(originalResult.container.querySelector('.pomo-feed-status__scribble-border')).toBeNull()

  originalResult.unmount()
  const scribbleResult = render(() => <PFeedStatus sceneStyle="scribble" />)
  const scribbleStatus = scribbleResult.container.querySelector('.pomo-feed-status')
  const scribbleBorder = scribbleResult.container.querySelector(
    '.pomo-feed-status__scribble-border',
  )
  const scribbleSurface = scribbleResult.container.querySelector(
    '.pomo-feed-status-frame .pomo-scribble-panel__surface',
  ) as HTMLElement

  expect(scribbleBorder).toBeInstanceOf(SVGElement)
  expect(scribbleBorder?.parentElement?.classList).toContain('pomo-feed-status-frame')
  expect(scribbleSurface.classList).toContain('pomo-scribble-mask')
  expect(scribbleSurface).not.toHaveAttribute('style')
  expect(scribbleSurface.contains(scribbleBorder)).toBe(false)
  expect(scribbleStatus?.classList).toContain('rounded-none')
  expect(scribbleStatus?.classList).toContain('border-0')
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

it('should render no feed notice while the feed state is idle', () => {
  vi.mocked(usePFeedContext).mockReturnValue(createFeeds([]))

  render(() => <PFeedStatus />)

  expect(screen.queryByRole('status')).toBeNull()
})

it('should hide feed syncing activity', () => {
  const message = '새 소식을 확인하고 있어요.'
  vi.mocked(usePFeedContext).mockReturnValue(
    createFeeds([], false, [], {state: () => ({message, progress: 50, status: 'syncing'})}),
  )
  render(() => <PFeedStatus />)

  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByText(message)).toBeNull()
})

it('should render an error and let users retry a failed feed check', () => {
  const errorFeeds = createFeeds([], false, [], {
    state: () => ({message: '피드를 확인하지 못했어요.', status: 'error'}),
  })
  vi.mocked(usePFeedContext).mockReturnValue(errorFeeds)
  const errorResult = render(() => <PFeedStatus />)

  expect(screen.getByRole('status')).toHaveAttribute('data-state', 'error')
  fireEvent.click(errorResult.container.querySelector('button')!)
  expect(errorFeeds.syncNow).toHaveBeenCalledOnce()
})

it('should offer preparation for a pending feed without calling it incomplete', async () => {
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  const feeds = createFeeds([], false, [{...RECOVERY_JOB, status: 'pending'}])
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  render(() => <PFeedStatus />)
  expect(screen.getByText('준비할 피드 대화 1개')).toBeInTheDocument()
  expect(screen.queryByText('미완성 피드 대화 1개')).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '준비하기'}))
  await vi.waitFor(() => expect(feeds.retryRecovery).toHaveBeenCalledOnce())
})

it('should replace preparation with listening after the feed audio is ready', async () => {
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  const [ready, setReady] = createSignal(false)
  const feeds = createFeeds([], false, [], {
    latestReady: () => (ready() ? READY_DIALOGUE : null),
    recoveryJobs: () => (ready() ? [] : [{...RECOVERY_JOB, status: 'pending'}]),
    retryRecovery: vi.fn(async () => {
      setReady(true)
    }),
    unlistenedDialogues: () => (ready() ? [READY_DIALOGUE] : []),
  })
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  render(() => <PFeedStatus />)
  fireEvent.click(screen.getByRole('button', {name: '준비하기'}))
  await vi.waitFor(() => expect(screen.getByRole('button', {name: '듣기'})).toBeInTheDocument())
  expect(screen.queryByRole('button', {name: '준비하기'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '듣기'}))
  expect(feeds.listenAll).toHaveBeenCalledOnce()
})
