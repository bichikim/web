/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PModal, type PModalProps} from 'src/components/PModal'
import {
  type FeedDialogueJob,
  type FeedDialogueListItem,
  type PFeedController,
  type PFeedState,
  usePFeedContext,
} from 'src/features/focus-room-feed'
import {
  type ModelDownloadController,
  type ModelDownloadResult,
  type ModelDownloadState,
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
  overrides: Partial<PFeedController> = {},
): PFeedController => ({
  cancelProcessing: vi.fn(async () => undefined),
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
  ...overrides,
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
  vi.mocked(PModal).mockImplementation((props: PModalProps) => {
    const title = props.title

    return (
      <Show when={props.isOpen}>
        <div aria-label={title} role="dialog">
          {props.children}
        </div>
      </Show>
    )
  })
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

it('should show feed generation status and block duplicate retry while its model downloads', async () => {
  renderModal()
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  const modelDownload = createModelDownload()
  const [downloadState, setDownloadState] = createSignal<ModelDownloadState>({status: 'idle'})
  let completeDownload: () => void = () => undefined
  vi.mocked(modelDownload.startVoiceModel).mockImplementation(
    (modelId) =>
      new Promise((resolve) => {
        setDownloadState({
          label: 'Supertonic Full 음성',
          percentage: 42,
          status: 'loading',
          target: {kind: 'voice', modelId},
        })
        completeDownload = () => {
          setDownloadState({status: 'idle'})
          resolve({status: 'complete'})
        }
      }),
  )
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue({...modelDownload, state: downloadState})
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <PFeedStatus />)

  const retryButton = screen.getByRole('button', {name: '다시 시도'})
  fireEvent.click(retryButton)
  await screen.findByRole('dialog', {name: /모델을 받을까요/})
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))

  await vi.waitFor(() => expect(modelDownload.startVoiceModel).toHaveBeenCalledOnce())
  expect(screen.getByRole('status')).toHaveAttribute('data-state', 'generating')
  expect(screen.getByText('Supertonic Full 음성 모델 받는 중 · 42%')).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull()

  fireEvent.click(retryButton)
  expect(isSupertonicModelDownloaded).toHaveBeenCalledOnce()
  expect(modelDownload.startVoiceModel).toHaveBeenCalledOnce()

  completeDownload()
  await vi.waitFor(() => expect(feeds.retryRecovery).toHaveBeenCalledOnce())
})

it('should show an already active recovery model download as feed generation', () => {
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  const modelDownload = createModelDownload()
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue({
    ...modelDownload,
    state: () => ({
      label: 'Supertonic Full 음성',
      percentage: 73,
      status: 'loading',
      target: {kind: 'voice', modelId: 'full'},
    }),
  })

  render(() => <PFeedStatus />)

  expect(screen.getByRole('status')).toHaveAttribute('data-state', 'generating')
  expect(screen.getByText('Supertonic Full 음성 모델 받는 중 · 73%')).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull()
})

it('should cancel a recovery model download and feed processing together', async () => {
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  const modelDownload = createModelDownload()
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue({
    ...modelDownload,
    state: () => ({
      label: 'Supertonic Full 음성',
      percentage: 73,
      status: 'loading',
      target: {kind: 'voice', modelId: 'full'},
    }),
  })
  render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '중지'}))

  expect(modelDownload.cancel).toHaveBeenCalledOnce()
  await vi.waitFor(() => expect(feeds.cancelProcessing).toHaveBeenCalledOnce())
})

it('should keep recovery actions hidden until cancellation persistence finishes', async () => {
  const [downloadState, setDownloadState] = createSignal<ModelDownloadState>({
    label: 'Supertonic Full 음성',
    percentage: 73,
    status: 'loading',
    target: {kind: 'voice', modelId: 'full'},
  })
  let finishCancellation: () => void = () => undefined
  const feeds = createFeeds([], false, [RECOVERY_JOB], {
    cancelProcessing: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCancellation = resolve
        }),
    ),
  })
  const modelDownload = createModelDownload()
  vi.mocked(modelDownload.cancel).mockImplementation(() => setDownloadState({status: 'idle'}))
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue({...modelDownload, state: downloadState})
  render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '중지'}))

  expect(screen.getByText('피드 처리를 중지하는 중…')).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '중지'})).toBeDisabled()
  expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull()
  finishCancellation()

  await screen.findByRole('button', {name: '다시 시도'})
})

it('should stop active feed generation without cancelling an unrelated model download', async () => {
  const feeds = createFeeds([], false, [], {
    state: () => ({message: '새 소식 · 1/3 구간 생성 중', progress: 33, status: 'generating'}),
  })
  const modelDownload = createModelDownload()
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue({
    ...modelDownload,
    state: () => ({
      label: '관련 없는 모델',
      percentage: 10,
      status: 'loading',
      target: {kind: 'voice', modelId: 'int8'},
    }),
  })
  render(() => <PFeedStatus />)

  expect(screen.getByText('새 소식 · 1/3 구간 생성 중')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '중지'}))

  await vi.waitFor(() => expect(feeds.cancelProcessing).toHaveBeenCalledOnce())
  expect(modelDownload.cancel).not.toHaveBeenCalled()
})

it('should report a feed cancellation failure and restore the stop action', async () => {
  const cancellationFailure = new Error('cancel failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const feeds = createFeeds([], false, [], {
    cancelProcessing: vi.fn().mockRejectedValue(cancellationFailure),
    state: () => ({message: '새 소식 음성 생성 중', progress: null, status: 'generating'}),
  })
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  render(() => <PFeedStatus />)

  const stopButton = screen.getByRole('button', {name: '중지'})
  fireEvent.click(stopButton)

  await vi.waitFor(() =>
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to cancel feed processing.',
      cancellationFailure,
    ),
  )
  expect(stopButton).not.toBeDisabled()
})

it('should keep recovery visible while an unrelated voice model downloads', () => {
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  const modelDownload = createModelDownload()
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue({
    ...modelDownload,
    state: () => ({
      label: 'Supertonic INT8 음성',
      percentage: 25,
      status: 'loading',
      target: {kind: 'voice', modelId: 'int8'},
    }),
  })

  render(() => <PFeedStatus />)

  expect(screen.getByRole('status')).toHaveAttribute('data-state', 'recovery')
  expect(screen.getByRole('button', {name: '다시 시도'})).toBeDisabled()
  expect(screen.queryByText(/Supertonic INT8 음성 모델 받는 중/)).toBeNull()
})

it('should render no feed notice while the feed state is idle', () => {
  vi.mocked(usePFeedContext).mockReturnValue(createFeeds([]))

  render(() => <PFeedStatus />)

  expect(screen.queryByRole('status')).toBeNull()
})

it('should stop downloading remaining models when a confirmed download is cancelled', async () => {
  renderModal()
  const secondRecoveryJob: FeedDialogueJob = {
    ...RECOVERY_JOB,
    feedItemId: 'item-2',
    id: 'job-2',
    modelId: 'int8',
  }
  const feeds = createFeeds([], false, [RECOVERY_JOB, secondRecoveryJob])
  const modelDownload = createModelDownload()
  vi.mocked(modelDownload.startVoiceModel).mockResolvedValue({status: 'cancelled'})
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
  await screen.findByRole('dialog', {name: /모델을 받을까요/})
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))

  await vi.waitFor(() => expect(modelDownload.startVoiceModel).toHaveBeenCalledOnce())
  expect(modelDownload.startVoiceModel).toHaveBeenCalledWith('full')
  expect(feeds.retryRecovery).not.toHaveBeenCalled()
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

it('should restore retry actions when checking a feed model fails', async () => {
  const checkFailure = new Error('model check failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(isSupertonicModelDownloaded).mockRejectedValue(checkFailure)
  render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))

  await vi.waitFor(() =>
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to check feed dialogue models.',
      checkFailure,
    ),
  )
  expect(screen.getByRole('button', {name: '다시 시도'})).not.toBeDisabled()
  expect(feeds.retryRecovery).not.toHaveBeenCalled()
})

it('should ignore model consent confirmation while a download is already active', async () => {
  renderModal()
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  const modelDownload = createModelDownload()
  const downloadState = vi.fn<ModelDownloadController['state']>(() => ({status: 'idle'}))
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue({...modelDownload, state: downloadState})
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
  const confirmButton = await screen.findByRole('button', {name: '받고 시작'})
  downloadState.mockReturnValue({
    label: 'Supertonic Full 음성',
    percentage: 10,
    status: 'loading',
    target: {kind: 'voice', modelId: 'full'},
  })

  fireEvent.click(confirmButton)

  expect(modelDownload.startVoiceModel).not.toHaveBeenCalled()
  expect(feeds.retryRecovery).not.toHaveBeenCalled()
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

it('should keep showing generation when the first of two feed dialogues becomes ready', () => {
  const [dialogues, setDialogues] = createSignal<ReadonlyArray<FeedDialogueListItem>>([])
  const [state, setState] = createSignal<PFeedState>({
    message: '첫 번째 음성을 만들고 있어요.',
    progress: 50,
    status: 'generating',
  })
  const feeds = createFeeds([], false, [], {
    dialogues,
    latestReady: () => dialogues()[0] ?? null,
    state,
    unlistenedDialogues: dialogues,
  })
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  render(() => <PFeedStatus />)

  expect(screen.getByText('첫 번째 음성을 만들고 있어요.')).toBeInTheDocument()

  setDialogues([READY_DIALOGUE])
  setState({
    message: '두 번째 음성 모델을 준비하고 있어요.',
    progress: 0,
    status: 'preparing',
  })

  expect(screen.getByRole('status')).toHaveAttribute('data-state', 'preparing')
  expect(screen.getByText('두 번째 음성 모델을 준비하고 있어요.')).toBeInTheDocument()
  expect(screen.queryByText('새 피드 대화가 준비됐어요')).toBeNull()

  setState({
    message: '두 번째 음성을 만들고 있어요.',
    progress: 10,
    status: 'generating',
  })

  expect(screen.getByRole('status')).toHaveAttribute('data-state', 'generating')
  expect(screen.getByText('두 번째 음성을 만들고 있어요.')).toBeInTheDocument()
  expect(screen.queryByText('새 피드 대화가 준비됐어요')).toBeNull()
})

it('should hide recovery actions when another feed generation is already active', () => {
  const [state, setState] = createSignal<PFeedState>({message: '대기 중', status: 'idle'})
  const feeds = createFeeds([], false, [RECOVERY_JOB], {state})
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  render(() => <PFeedStatus />)
  const retryButton = screen.getByRole('button', {name: '다시 시도'})

  setState({
    message: '다른 피드 음성을 만들고 있어요.',
    progress: 25,
    status: 'generating',
  })

  expect(screen.getByRole('status')).toHaveAttribute('data-state', 'generating')
  expect(screen.getByText('다른 피드 음성을 만들고 있어요.')).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '다시 시도'})).toBeNull()

  fireEvent.click(retryButton)
  expect(isSupertonicModelDownloaded).not.toHaveBeenCalled()
  expect(feeds.retryRecovery).not.toHaveBeenCalled()
})

it('should dismiss or delete recovery jobs and report failed user actions', async () => {
  const listenFailure = new Error('listen failed')
  const listeningFeeds = createFeeds([READY_DIALOGUE], false, [], {
    listenAll: vi.fn().mockRejectedValue(listenFailure),
  })
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(usePFeedContext).mockReturnValue(listeningFeeds)
  const listeningResult = render(() => <PFeedStatus />)

  fireEvent.click(listeningResult.container.querySelector('button')!)
  await Promise.resolve()
  expect(consoleError).toHaveBeenCalledWith('Failed to play queued feed dialogues.', listenFailure)
  listeningResult.unmount()

  const retryFailure = new Error('retry failed')
  const deleteFailure = new Error('delete failed')
  const recoveryFeeds = createFeeds([], false, [RECOVERY_JOB], {
    deleteRecovery: vi.fn().mockRejectedValue(deleteFailure),
    retryRecovery: vi.fn().mockRejectedValue(retryFailure),
  })
  vi.mocked(usePFeedContext).mockReturnValue(recoveryFeeds)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  const recoveryResult = render(() => <PFeedStatus />)
  const recoveryButtons = recoveryResult.container.querySelectorAll('button')

  fireEvent.click(recoveryButtons[0]!)
  await vi.waitFor(() => expect(recoveryFeeds.retryRecovery).toHaveBeenCalledOnce())
  await vi.waitFor(() => expect(screen.getByRole('button', {name: '나중에'})).not.toBeDisabled())
  fireEvent.click(screen.getByRole('button', {name: '나중에'}))
  fireEvent.click(screen.getByRole('button', {name: '삭제'}))

  await vi.waitFor(() =>
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to delete feed dialogue jobs.',
      deleteFailure,
    ),
  )

  expect(recoveryFeeds.dismissRecovery).toHaveBeenCalledOnce()
  expect(recoveryFeeds.deleteRecovery).toHaveBeenCalledOnce()
  expect(consoleError).toHaveBeenCalledWith('Failed to retry feed dialogues.', retryFailure)
})

it('should keep a single model check in flight and let users cancel download consent', async () => {
  renderModal()
  const feeds = createFeeds([], false, [RECOVERY_JOB])
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  let resolveDownloadCheck: ((downloaded: boolean) => void) | undefined
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveDownloadCheck = resolve
    }),
  )
  const recoveryResult = render(() => <PFeedStatus />)
  const retryButton = recoveryResult.container.querySelector('button')!

  fireEvent.click(retryButton)
  expect(retryButton).toBeDisabled()
  expect(screen.getByRole('button', {name: '나중에'})).toBeDisabled()
  expect(screen.getByRole('button', {name: '삭제'})).toBeDisabled()
  expect(isSupertonicModelDownloaded).toHaveBeenCalledOnce()

  resolveDownloadCheck?.(false)
  const dialog = await screen.findByRole('dialog', {name: /모델을 받을까요/})
  fireEvent.click(dialog.querySelector('button')!)

  expect(screen.queryByRole('dialog', {name: /모델을 받을까요/})).toBeNull()
  expect(feeds.retryRecovery).not.toHaveBeenCalled()
})

it('should stop retrying when another feed generation starts during the model check', async () => {
  const [state, setState] = createSignal<PFeedState>({message: '대기 중', status: 'idle'})
  const feeds = createFeeds([], false, [RECOVERY_JOB], {state})
  let resolveDownloadCheck: ((downloaded: boolean) => void) | undefined
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveDownloadCheck = resolve
    }),
  )
  render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
  await vi.waitFor(() => expect(isSupertonicModelDownloaded).toHaveBeenCalledOnce())
  setState({
    message: '자동 동기화로 새 피드를 만드는 중이에요.',
    progress: 10,
    status: 'generating',
  })
  resolveDownloadCheck?.(true)
  await new Promise((resolve) => {
    setTimeout(resolve, 0)
  })

  expect(screen.getByRole('status')).toHaveAttribute('data-state', 'generating')
  expect(feeds.retryRecovery).not.toHaveBeenCalled()
  expect(screen.queryByRole('dialog', {name: /모델을 받을까요/})).toBeNull()
})

it('should close pending model consent when another feed generation starts', async () => {
  renderModal()
  const [state, setState] = createSignal<PFeedState>({message: '대기 중', status: 'idle'})
  const feeds = createFeeds([], false, [RECOVERY_JOB], {state})
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <PFeedStatus />)

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
  await screen.findByRole('dialog', {name: /모델을 받을까요/})

  setState({
    message: '자동 동기화로 새 피드를 만드는 중이에요.',
    progress: 10,
    status: 'generating',
  })

  expect(screen.getByRole('status')).toHaveAttribute('data-state', 'generating')
  await vi.waitFor(() => expect(screen.queryByRole('dialog', {name: /모델을 받을까요/})).toBeNull())
  expect(feeds.retryRecovery).not.toHaveBeenCalled()
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
