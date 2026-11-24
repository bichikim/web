import {PreferenceProvider} from 'src/hooks/use-preference'
/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  onPresses: [] as Array<(source: HTMLButtonElement) => void>,
}))

vi.mock('src/features/focus-room-feed', async () => {
  const {isNoFeedConnectionGuidance} = await vi.importActual<
    typeof import('src/features/focus-room-feed/feed-controller')
  >('src/features/focus-room-feed/feed-controller')

  return {isNoFeedConnectionGuidance, usePFeedContext: vi.fn()}
})
vi.mock('src/components/p-button/PButton', () => ({
  PButton: (props: {
    readonly children: JSX.Element
    readonly disabled?: boolean
    readonly onPress: (source: HTMLButtonElement) => void
  }) => {
    mocks.onPresses.push(props.onPress)
    return <button disabled={props.disabled}>{props.children}</button>
  },
}))
vi.mock('src/components/p-modal/PModal', () => ({PModal: () => null}))
vi.mock('src/features/supertonic', async () => {
  const actual: typeof import('src/features/supertonic') =
    await vi.importActual('src/features/supertonic')
  return {...actual, isSupertonicModelDownloaded: vi.fn()}
})

import {type PFeedController, usePFeedContext} from 'src/features/focus-room-feed'
import {type ModelDownloadRuntime, PModelDownloadProvider} from 'src/features/model-download'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
import {
  createFeeds as createSharedFeeds,
  RECOVERY_JOB as SHARED_RECOVERY_JOB,
} from '../../__tests__/feed-status/fixtures'
import {PFeedStatus} from '../PFeedStatus'

const RECOVERY_JOB = {
  ...SHARED_RECOVERY_JOB,
  errorMessage: '음성 모델 다운로드가 필요해요.',
}

const createFeeds = (): PFeedController =>
  createSharedFeeds([], false, [RECOVERY_JOB], {
    dialogues: () => [],
    recoveryJobs: () => [RECOVERY_JOB],
    unlistenedDialogues: () => [],
  })

beforeEach(() => {
  mocks.onPresses.length = 0
  vi.clearAllMocks()
})

it('should ignore a duplicated retry request while model availability is still checking', () => {
  let resolveCheck: ((downloaded: boolean) => void) | undefined
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveCheck = resolve
    }),
  )
  vi.mocked(usePFeedContext).mockReturnValue(createFeeds())
  const runtime: ModelDownloadRuntime = {
    createTextClient: () => {
      throw new Error('텍스트 모델 client를 만들면 안 됩니다.')
    },
    createVoiceClient: () => {
      throw new Error('음성 모델 client를 만들면 안 됩니다.')
    },
  }

  render(
    () => (
      <PModelDownloadProvider runtime={runtime}>
        <PFeedStatus />
      </PModelDownloadProvider>
    ),
    {wrapper: PreferenceProvider},
  )
  const retry = mocks.onPresses[0]!
  const button = document.createElement('button')

  retry(button)
  retry(button)

  expect(isSupertonicModelDownloaded).toHaveBeenCalledOnce()
  resolveCheck?.(true)
})

it('should preserve a disabled stop handler while cancellation is pending', async () => {
  let finishCancellation: () => void = () => undefined
  const feeds: PFeedController = {
    ...createFeeds(),
    cancelProcessing: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCancellation = resolve
        }),
    ),
    recoveryJobs: () => [],
    state: () => ({message: '피드 음성 생성 중', progress: null, status: 'generating'}),
  }
  vi.mocked(usePFeedContext).mockReturnValue(feeds)
  const runtime: ModelDownloadRuntime = {
    createTextClient: () => {
      throw new Error('텍스트 모델 client를 만들면 안 됩니다.')
    },
    createVoiceClient: () => {
      throw new Error('음성 모델 client를 만들면 안 됩니다.')
    },
  }
  render(
    () => (
      <PModelDownloadProvider runtime={runtime}>
        <PFeedStatus />
      </PModelDownloadProvider>
    ),
    {wrapper: PreferenceProvider},
  )

  mocks.onPresses[0]?.(document.createElement('button'))

  await vi.waitFor(() => expect(mocks.onPresses.length).toBeGreaterThanOrEqual(2))
  expect(feeds.cancelProcessing).toHaveBeenCalledOnce()
  finishCancellation()
})
