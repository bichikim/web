/** @vitest-environment node */

import {expect, it, vi} from 'vitest'

import type {FeedDialogueJob} from '../features/focus-room-feed/feed-dialogue-schema'
import {prepareFeedGeneration} from '../features/focus-room-feed/generation-preparation'

const JOB: FeedDialogueJob = {
  createdAt: '2026-08-14T00:00:00.000Z',
  errorMessage: null,
  feedConnectionId: 'feed-1',
  feedItemId: 'item-1',
  id: 'job-1',
  itemTitle: '새 피드',
  modelId: 'int8',
  publishedAt: '2026-08-14T00:00:00.000Z',
  script: '새 소식',
  sourceTitle: '테스트 피드',
  sourceUrl: 'https://example.com/item-1',
  status: 'queued',
  updatedAt: '2026-08-14T00:00:00.000Z',
  version: 1,
  voiceId: 'M1',
}

const MAXIMUM_MODEL_SWITCHES = 8

it('should finish preparing when generation settings keep alternating modelId', async () => {
  let resolveCount = 0
  const prepareModel = vi.fn(async () => true)
  const resolveGenerationSettings = vi.fn(async () => {
    resolveCount += 1
    if (resolveCount > MAXIMUM_MODEL_SWITCHES) {
      throw new Error(`prepareFeedGeneration exceeded ${MAXIMUM_MODEL_SWITCHES} model switches`)
    }

    return resolveCount % 2 === 1
      ? {modelId: 'int8' as const, voiceId: 'M1' as const}
      : {modelId: 'full' as const, voiceId: 'Yuna' as const}
  })

  const result = await prepareFeedGeneration({
    allowModelDownload: true,
    isModelDownloaded: vi.fn(async () => true),
    job: JOB,
    now: () => '2026-08-14T00:01:00.000Z',
    prepareModel,
    repository: {startJob: vi.fn(async () => true)},
    resolveGenerationSettings,
  })

  expect(result.status).toBe('ready')
  expect(prepareModel.mock.calls.length).toBeLessThanOrEqual(MAXIMUM_MODEL_SWITCHES)
})
