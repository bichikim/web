import {PreferenceProvider} from 'src/hooks/use-preference'
/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type FeedDialogueJob, usePFeedContext} from 'src/features/focus-room-feed'
import {useModelDownload} from 'src/features/model-download'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
import {PFeedStatus} from '../components/p-feed-status/PFeedStatus'
import {
  createFeeds,
  createModelDownload,
  RECOVERY_JOB,
  renderModal,
} from '../components/__tests__/feed-status/fixtures'

vi.mock('src/features/focus-room-feed', async () => {
  const {isNoFeedConnectionGuidance} = await vi.importActual<
    typeof import('src/features/focus-room-feed/feed-controller')
  >('src/features/focus-room-feed/feed-controller')

  return {isNoFeedConnectionGuidance, usePFeedContext: vi.fn()}
})

vi.mock('src/features/model-download', () => ({
  useModelDownload: vi.fn(),
}))

vi.mock('src/components/p-modal/PModal', () => ({PModal: vi.fn()}))

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

const createRecoveryFeeds = () => {
  const [recoveryJobs, setRecoveryJobs] = createSignal<ReadonlyArray<FeedDialogueJob>>([RECOVERY_JOB])
  return createFeeds([], false, [], {
    dismissRecovery: () => setRecoveryJobs([]),
    recoveryJobs,
  })
}

it('should close model download consent when recovery jobs are dismissed while it is open', async () => {
  renderModal()
  const feeds = createRecoveryFeeds()
  const modelDownload = createModelDownload()
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <PFeedStatus />, {wrapper: PreferenceProvider})

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
  await screen.findByRole('dialog', {name: /모델을 받을까요/})

  fireEvent.click(screen.getByRole('button', {name: '나중에'}))

  expect(screen.queryByRole('dialog', {name: /모델을 받을까요/})).toBeNull()
})

it('still starts voice download when confirming consent left open after dismissing recovery', async () => {
  renderModal()
  const feeds = createRecoveryFeeds()
  const modelDownload = createModelDownload()
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  vi.mocked(useModelDownload).mockReturnValue(modelDownload)
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <PFeedStatus />, {wrapper: PreferenceProvider})

  fireEvent.click(screen.getByRole('button', {name: '다시 시도'}))
  await screen.findByRole('dialog', {name: /모델을 받을까요/})
  fireEvent.click(screen.getByRole('button', {name: '나중에'}))
  fireEvent.click(screen.getByRole('button', {name: '받고 시작'}))

  await vi.waitFor(() => expect(modelDownload.startVoiceModel).toHaveBeenCalledWith('full'))
  expect(feeds.retryRecovery).toHaveBeenCalledOnce()
})
