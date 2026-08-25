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

import {usePFeedContext} from 'src/features/focus-room-feed'
import {type ModelDownloadRuntime, PModelDownloadProvider} from 'src/features/model-download'
import {isSupertonicModelDownloaded} from 'src/features/supertonic'
import {PFeedStatus} from '../PFeedStatus'

it('should ignore a duplicated retry request while model availability is still checking', () => {
  let resolveCheck: ((downloaded: boolean) => void) | undefined
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(
    new Promise((resolve) => {
      resolveCheck = resolve
    }),
  )
  vi.mocked(usePFeedContext).mockReturnValue({
    isListening: () => false,
    latestReady: () => null,
    recoveryJobs: () => [{modelId: 'full'}],
    retryRecovery: vi.fn(async () => undefined),
  } as never)
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
