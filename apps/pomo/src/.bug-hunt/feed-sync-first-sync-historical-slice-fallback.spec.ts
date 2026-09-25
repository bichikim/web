/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {
  createRepository,
  createRss,
  createSettingsResolver,
} from '../features/focus-room-feed/__tests__/feed-sync.fixture'
import {synchronizeFeeds} from '../features/focus-room-feed/feed-sync'
import type {FeedConnection} from '../features/focus-room-feed/schema'

it('should ignore every pre-subscription dated item on the first sync without slice(-1) queue', async () => {
  const connection: FeedConnection = {
    createdAt: '2026-08-14T00:06:00.000Z',
    id: 'feed-historical',
    updatedAt: '2026-08-14T00:06:00.000Z',
    url: 'https://example.com/feed.xml',
    version: 1,
    voiceId: 'M2',
  }
  const {items, jobs, repository} = createRepository()
  const summary = await synchronizeFeeds({
    connections: [connection],
    createId: () => 'job-should-not-run',
    fetcher: vi.fn(
      async () =>
        new Response(
          createRss([
            {id: 'older', minute: '01'},
            {id: 'newer', minute: '04'},
          ]),
        ),
    ),
    now: new Date('2026-08-14T00:07:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(connection),
  })

  expect(summary.queuedJobIds).toEqual([])
  expect(jobs).toHaveLength(0)
  expect(items.every((item) => item.status === 'ignored')).toBe(true)
  expect(items.map((item) => item.feedItemId).sort()).toEqual(['newer', 'older'])
})
