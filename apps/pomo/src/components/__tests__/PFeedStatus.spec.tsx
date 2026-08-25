/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/PModal'
import {
  type FeedDialogueJob,
  type FeedDialogueListItem,
  type PFeedController,
  usePFeedContext,
} from 'src/features/focus-room-feed'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  useModelDownload,
} from 'src/features/model-download'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
import {PFeedStatus} from '../PFeedStatus'

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

const READY_DIALOGUE: FeedDialogueListItem = {
  dialogue: {
    audioKey: 'audio-1',
    createdAt: '2026-08-14T00:00:00.000Z',
    durationMs: 1000,
    id: 'dialogue-1',
    language: 'ko',
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

const RECOVERY_JOB: FeedDialogueJob = {
  createdAt: '2026-08-14T00:00:00.000Z',
  errorMessage: '음성 모델 다운로드에 동의한 뒤 다시 시도해 주세요.',
  feedConnectionId: 'feed-1',
  feedItemId: 'item-1',
  id: 'job-1',
  itemTitle: '새로운 소식',
  modelId: 'full',
  publishedAt: '2026-08-14T00:00:00.000Z',
  script: '피드 음성 대사',
  sourceTitle: '테스트 피드',
  sourceUrl: 'https://example.com/article',
  status: 'failed',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
}

const createFeeds = (
  dialogues: ReadonlyArray<FeedDialogueListItem> = [READY_DIALOGUE],
  isListening = false,
  recoveryJobs: ReadonlyArray<FeedDialogueJob> = [],
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
  recoveryJobs: () => recoveryJobs,
  retryRecovery: vi.fn(async () => undefined),
  state: () => ({message: '대기 중', status: 'idle'}),
  syncNow: vi.fn(async () => undefined),
  unlistenedDialogues: () => dialogues,
})

const createModelDownload = (): ModelDownloadController => ({
  cancel: vi.fn(),
  dismissError: vi.fn(),
  dispose: vi.fn(),
  startTextModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  startVoiceModel: vi.fn(async (): Promise<ModelDownloadResult> => ({status: 'complete'})),
  state: () => ({status: 'idle'}),
})

beforeEach(() => {
  vi.mocked(useModelDownload).mockReturnValue(createModelDownload())
})

afterEach(() => {
  vi.clearAllMocks()
})

const renderModal = () => {
  vi.mocked(PModal).mockImplementation((props: PModalProps) => (
    <Show when={props.isOpen}>
      <div aria-label={props.title} role="dialog">
        {props.children}
      </div>
    </Show>
  ))
}

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
  expect(scribbleSurface.classList).toContain('[mask-image:var(--pomo-scribble-panel-mask)]')
  expect(scribbleSurface.style.getPropertyValue('--pomo-scribble-panel-mask')).toContain(
    'data:image/svg+xml',
  )
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

it('should require download consent before retrying a feed without a cached model', async () => {
  renderModal()
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  const modelDownload = createModelDownload()
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))

  const dialog = await screen.findByRole('dialog', {name: /모델을 받을까요/})
  expect(dialog.textContent).toContain('데이터 요금이 발생할 수 있어요')
  expect(feeds.retryRecovery).not.toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))
  await vi.waitFor(() => expect(feeds.retryRecovery).toHaveBeenCalledTimes(1))
  expect(modelDownload.startVoiceModel).toHaveBeenCalledWith('full')
})

it('should retry immediately when every feed model is already cached', async () => {
  renderModal()
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))

  await vi.waitFor(() => expect(feeds.retryRecovery).toHaveBeenCalledTimes(1))
  expect(screen.queryByRole('dialog', {name: /모델을 받을까요/})).toBeNull()
})

it('should continue a confirmed feed model download after leaving the page', async () => {
  renderModal()
  let resolveDownload: (result: {readonly status: 'complete'}) => void = () => undefined
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  const modelDownload = createModelDownload()
  vi.mocked(modelDownload.startVoiceModel).mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveDownload = resolve
      }),
  )
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  const result = render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
  await screen.findByRole('dialog', {name: /모델을 받을까요/})
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))
  await vi.waitFor(() => expect(modelDownload.startVoiceModel).toHaveBeenCalledWith('full'))
  result.unmount()
  resolveDownload({status: 'complete'})

  await vi.waitFor(() => expect(feeds.retryRecovery).toHaveBeenCalledTimes(1))
  expect(modelDownload.cancel).not.toHaveBeenCalled()
  expect(modelDownload.dispose).not.toHaveBeenCalled()
})
