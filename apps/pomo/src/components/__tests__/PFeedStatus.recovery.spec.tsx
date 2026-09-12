/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type FeedDialogueJob, type PFeedState, usePFeedContext} from 'src/features/focus-room-feed'
import {type ModelDownloadController, useModelDownload} from 'src/features/model-download'
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

it.each(['cached', 'download', 'model-check'] as const)(
  'should show retry failure and clear it on the next attempt through %s',
  async (path) => {
    renderModal()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const feeds = createFeeds([], false, [RECOVERY_JOB])
    vi.mocked(usePFeedContext).mockReturnValue(feeds)
    vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(path !== 'download')
    if (path === 'model-check') {
      vi.mocked(isSupertonicModelDownloaded).mockRejectedValueOnce(new Error('check failed'))
    } else {
      vi.mocked(feeds.retryRecovery).mockRejectedValueOnce(new Error('retry failed'))
    }
    render(() => <PFeedStatus />)

    fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
    if (path === 'download') {
      fireEvent.click(await screen.findByRole('button', {name: '받고 시작'}))
    }

    const message = '피드 대화를 다시 만들지 못했어요. 잠시 후 다시 시도해 주세요.'
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(message)
    expect(screen.getByRole('button', {name: '다시 시도'})).not.toBeDisabled()
    expect(screen.getByRole('button', {name: '나중에'})).not.toBeDisabled()
    expect(screen.getByRole('button', {name: '삭제'})).not.toBeDisabled()

    vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
    fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
    expect(screen.queryByText(message)).toBeNull()
    await vi.waitFor(() =>
      expect(feeds.retryRecovery).toHaveBeenCalledTimes(path === 'model-check' ? 1 : 2),
    )
    await vi.waitFor(() => expect(screen.getByText('처음부터 다시 만들까요?')).toBeInTheDocument())
  },
)

it('should clear an old retry failure when recovery jobs are dismissed', async () => {
  const [recoveryJobs, setRecoveryJobs] = createSignal<ReadonlyArray<FeedDialogueJob>>([
    RECOVERY_JOB,
  ])
  const feeds = createFeeds([], false, [], {
    dismissRecovery: () => setRecoveryJobs([]),
    recoveryJobs,
    retryRecovery: vi.fn().mockRejectedValue(new Error('retry failed')),
  })
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  render(() => <PFeedStatus />)
  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
  const message = '피드 대화를 다시 만들지 못했어요. 잠시 후 다시 시도해 주세요.'
  await screen.findByText(message)

  fireEvent.click(screen.getByRole('button', {name: '나중에'}))
  expect(screen.queryByRole('status')).toBeNull()
  setRecoveryJobs([{...RECOVERY_JOB, id: 'new-job'}])

  expect(screen.getByText('처음부터 다시 만들까요?')).toBeInTheDocument()
  expect(screen.queryByText(message)).toBeNull()
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
