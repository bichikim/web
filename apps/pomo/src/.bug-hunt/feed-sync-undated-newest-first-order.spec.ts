/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {
  CONNECTION,
  createRepository,
  createSettingsResolver,
} from '../features/focus-room-feed/__tests__/feed-sync.fixture'
import {synchronizeFeeds} from '../features/focus-room-feed/feed-sync'

const createUndatedRss = (itemIds: ReadonlyArray<string>) => {
  const entries = itemIds
    .map(
      (itemId) =>
        `<item><title>${itemId}</title><guid>${itemId}</guid><link>https://example.com/${itemId}</link><content:encoded>${itemId} 본문</content:encoded></item>`,
    )
    .join('')

  return `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>발행일 없는 피드</title>${entries}</channel></rss>`
}

it('should queue the newest undated item when the feed lists newest entries first', async () => {
  const {jobs, repository} = createRepository()

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-1',
    fetcher: vi.fn(async () => new Response(createUndatedRss(['newest', 'oldest']))),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(jobs.map((job) => job.feedItemId)).toEqual(['newest'])
})
