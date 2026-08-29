/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import type {PFeedController} from '../../features/focus-room-feed/feed-controller'
import {usePFeedContext} from '../../features/focus-room-feed/feed-context'
import {usePFeeds} from '../../features/focus-room-feed/use-focus-room-feeds'
import {PFeedProvider} from '../PFeedProvider'

vi.mock('../../features/focus-room-dialogue', () => ({usePEvents: vi.fn(() => ({}))}))
vi.mock('../../features/focus-room-feed/use-focus-room-feeds', () => ({usePFeeds: vi.fn()}))

const createController = (): PFeedController => ({
  cancelProcessing: vi.fn(async () => undefined),
  deleteRecovery: vi.fn(async () => undefined),
  dialogues: () => [],
  dismissRecovery: vi.fn(),
  isListening: () => false,
  issues: () => [],
  latestReady: () => null,
  listen: vi.fn(async () => undefined),
  listenAll: vi.fn(async () => undefined),
  onDeleteDialogue: vi.fn(async () => undefined),
  recoveryJobs: () => [],
  retryRecovery: vi.fn(async () => undefined),
  state: () => ({message: '대기 중', status: 'idle'}),
  syncNow: vi.fn(async () => undefined),
  unlistenedDialogues: () => [],
})

it('should ignore a delayed recovery retry after the provider is disposed', async () => {
  const controller = createController()
  vi.mocked(usePFeeds).mockReturnValue(controller)
  let captured: PFeedController | undefined
  const CaptureContext = () => {
    captured = usePFeedContext()
    return null
  }
  const view = render(() => (
    <PFeedProvider>
      <CaptureContext />
    </PFeedProvider>
  ))
  const context = captured

  if (context === undefined) {
    throw new Error('피드 context가 준비되지 않았습니다.')
  }

  view.unmount()
  await context.retryRecovery()

  expect(controller.retryRecovery).not.toHaveBeenCalled()
})

it('should delegate recovery retries while the provider is active', async () => {
  const controller = createController()
  vi.mocked(usePFeeds).mockReturnValue(controller)
  let captured: PFeedController | undefined
  const CaptureContext = () => {
    captured = usePFeedContext()
    return null
  }
  render(() => (
    <PFeedProvider>
      <CaptureContext />
    </PFeedProvider>
  ))
  await captured?.retryRecovery()
  expect(controller.retryRecovery).toHaveBeenCalledOnce()
})
