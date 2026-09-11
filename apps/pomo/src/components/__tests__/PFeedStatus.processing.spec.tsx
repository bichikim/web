/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  type FeedDialogueListItem,
  type PFeedState,
  usePFeedContext,
} from 'src/features/focus-room-feed'
import {type ModelDownloadState, useModelDownload} from 'src/features/model-download'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
import {PFeedStatus} from '../PFeedStatus'
import {
  createFeeds,
  createModelDownload,
  READY_DIALOGUE,
  RECOVERY_JOB,
  renderModal,
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
