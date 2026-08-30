import {expect, it, vi} from 'vitest'

import type {SupertonicClient} from '../../supertonic'
import {cancelFeedProcessing} from '../generation-cancellation'
import type {FeedDialogueJob} from '../feed-dialogue-schema'

const createJob = (id: string, status: FeedDialogueJob['status']): FeedDialogueJob => ({
  createdAt: '2026-08-14T00:00:00.000Z',
  errorMessage: null,
  feedConnectionId: 'feed-1',
  feedItemId: `item-${id}`,
  id,
  itemTitle: `피드 ${id}`,
  modelId: 'int8',
  publishedAt: '2026-08-14T00:00:00.000Z',
  script: '새 소식',
  sourceTitle: '테스트 피드',
  sourceUrl: `https://example.com/${id}`,
  status,
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'Yuna',
})

const createClient = (): SupertonicClient => ({
  cancelGeneration: vi.fn(),
  dispose: vi.fn(),
  generate: vi.fn<SupertonicClient['generate']>(),
  generateStream: vi.fn<SupertonicClient['generateStream']>(),
  initialize: vi.fn<SupertonicClient['initialize']>(),
})

it('should cancel resources and retain only visible recoverable jobs', async () => {
  const failed = createJob('failed', 'failed')
  const dismissed = createJob('dismissed', 'interrupted')
  const queued = createJob('queued', 'queued')
  const client = createClient()
  const abortController = new AbortController()
  const scheduledJobs = [{allowModelDownload: false, id: 'scheduled'}]
  const onRecovery = vi.fn()

  await cancelFeedProcessing({
    abortController,
    client,
    dismissedRecoveryIds: new Set([dismissed.id]),
    isDisposed: () => false,
    onRecovery,
    repository: {interruptUnfinishedJobs: vi.fn(async () => [failed, dismissed, queued])},
    scheduledJobs,
    updatedAt: '2026-08-15T00:00:00.000Z',
  })

  expect(scheduledJobs).toEqual([])
  expect(abortController.signal.aborted).toBe(true)
  expect(client.cancelGeneration).toHaveBeenCalledOnce()
  expect(client.dispose).toHaveBeenCalledOnce()
  expect(onRecovery).toHaveBeenCalledWith([failed])
})

it('should skip recovery updates after disposal without an active client', async () => {
  const onRecovery = vi.fn()

  await cancelFeedProcessing({
    abortController: new AbortController(),
    client: null,
    isDisposed: () => true,
    isRecoveryDismissed: () => false,
    onRecovery,
    repository: {interruptUnfinishedJobs: vi.fn(async () => [])},
    scheduledJobs: [],
    updatedAt: '2026-08-15T00:00:00.000Z',
  })

  expect(onRecovery).not.toHaveBeenCalled()
})
