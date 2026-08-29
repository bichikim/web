/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  onPresses: [] as Array<(source: HTMLButtonElement) => void>,
}))

vi.mock('src/features/focus-room-feed', () => ({usePFeedContext: vi.fn()}))
vi.mock('src/components/PButton', () => ({
  PButton: (props: {
    readonly children: JSX.Element
    readonly disabled?: boolean
    readonly onPress: (source: HTMLButtonElement) => void
  }) => {
    mocks.onPresses.push(props.onPress)
    return <button disabled={props.disabled}>{props.children}</button>
  },
}))
vi.mock('src/components/PModal', () => ({PModal: () => null}))
vi.mock('src/features/supertonic', async () => {
  const actual: typeof import('src/features/supertonic') =
    await vi.importActual('src/features/supertonic')
  return {...actual, isSupertonicModelDownloaded: vi.fn()}
})

import {
  type FeedDialogueJob,
  type PFeedController,
  usePFeedContext,
} from 'src/features/focus-room-feed'
import {type ModelDownloadRuntime, PModelDownloadProvider} from 'src/features/model-download'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
import {PFeedStatus} from '../PFeedStatus'

const RECOVERY_JOB = {
  createdAt: '2026-08-14T00:00:00.000Z',
  errorMessage: '음성 모델 다운로드가 필요해요.',
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
} satisfies FeedDialogueJob

const createFeeds = (): PFeedController => ({
  deleteRecovery: vi.fn(async () => undefined),
  dialogues: () => [],
  dismissRecovery: vi.fn(),
  isListening: () => false,
  issues: () => [],
  latestReady: () => null,
  listen: vi.fn(async () => undefined),
  listenAll: vi.fn(async () => undefined),
  onDeleteDialogue: vi.fn(async () => undefined),
  recoveryJobs: () => [RECOVERY_JOB],
  retryRecovery: vi.fn(async () => undefined),
  state: () => ({message: '대기 중', status: 'idle'}),
  syncNow: vi.fn(async () => undefined),
  unlistenedDialogues: () => [],
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

  render(() => (
    <PModelDownloadProvider runtime={runtime}>
      <PFeedStatus />
    </PModelDownloadProvider>
  ))
  const retry = mocks.onPresses[0]!
  const button = document.createElement('button')

  retry(button)
  retry(button)

  expect(isSupertonicModelDownloaded).toHaveBeenCalledOnce()
  resolveCheck?.(true)
})
