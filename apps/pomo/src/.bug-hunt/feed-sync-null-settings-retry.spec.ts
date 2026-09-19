/** @vitest-environment jsdom */
import {
  CONNECTION,
  createRepository,
  createRss,
} from '../features/focus-room-feed/__tests__/feed-sync.fixture'

import {expect, it, vi} from 'vitest'

import {synchronizeFeeds} from '../features/focus-room-feed/feed-sync'

/**
 * When resolveGenerationSettings returns null (connection removed from the repository
 * during sync), processFeedItem exits without persisting any feed-item record.
 * The item stays "unseen" and is re-fetched on every subsequent sync.
 */
it('should persist a skipped feed item when generation settings are unavailable', async () => {
  const {items, jobs, repository} = createRepository()
  const resolveGenerationSettings = vi.fn(async () => null)
  const fetcher = vi.fn(async () => new Response(createRss([{id: 'new', minute: '05'}])))
  const now = new Date('2026-08-14T00:06:00.000Z')

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-1',
    fetcher,
    now,
    repository,
    resolveGenerationSettings,
  })

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-2',
    fetcher,
    now,
    repository,
    resolveGenerationSettings,
  })

  expect(jobs).toHaveLength(0)
  expect(fetcher).toHaveBeenCalledOnce()
  expect(resolveGenerationSettings).toHaveBeenCalledTimes(1)
  expect(items).toHaveLength(1)
  expect(items[0]).toMatchObject({
    feedItemId: 'new',
    status: 'failed',
  })
})
