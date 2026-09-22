/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import type {FeedDialogueRepository} from '../features/focus-room-feed/feed-dialogue-repository'
import type {FeedDialogueJob, FeedItemRecord} from '../features/focus-room-feed/feed-dialogue-schema'
import {
  CONNECTION,
  createRss,
  createSettingsResolver,
} from '../features/focus-room-feed/__tests__/feed-sync.fixture'
import {synchronizeFeeds} from '../features/focus-room-feed/feed-sync'

const createTrackingRepository = () => {
  const items: FeedItemRecord[] = []
  const jobs: FeedDialogueJob[] = []

  const repository: FeedDialogueRepository = {
    complete: vi.fn(),
    deleteJobs: vi.fn(),
    dispose: vi.fn(),
    failJob: vi.fn(async () => true),
    interruptUnfinishedJobs: vi.fn(async () => []),
    listExpiredMetadata: vi.fn(async () => []),
    listItems: vi.fn(async (connectionId) =>
      items.filter((item) => item.feedConnectionId === connectionId),
    ),
    listJobs: vi.fn(async () => jobs),
    listMetadata: vi.fn(async () => []),
    markListened: vi.fn(),
    queue: vi.fn(async (job, item) => {
      jobs.push(job)
      items.push(item)
    }),
    recoverMissingDialogue: vi.fn(),
    removeItem: vi.fn(async (feedConnectionId, feedItemId) => {
      const index = items.findIndex(
        (item) =>
          item.feedConnectionId === feedConnectionId && item.feedItemId === feedItemId,
      )
      if (index >= 0) {
        items.splice(index, 1)
      }
    }),
    removeMetadata: vi.fn(),
    retryJobs: vi.fn(),
    saveItems: vi.fn(async (nextItems) => {
      items.push(...nextItems)
    }),
    startJob: vi.fn(),
  }

  return {items, jobs, repository}
}

it('should not re-queue a feed item after user deletion removes its stored record', async () => {
  const {items, jobs, repository} = createTrackingRepository()
  const rss = createRss([{id: 'article-1', minute: '05'}])
  const fetcher = vi.fn(async () => new Response(rss))

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-1',
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(jobs).toHaveLength(1)
  expect(items.some((item) => item.feedItemId === 'article-1')).toBe(true)

  await repository.removeItem(CONNECTION.id, 'article-1')

  jobs.length = 0

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-2',
    fetcher,
    now: new Date('2026-08-14T00:07:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(jobs).toHaveLength(0)
})
