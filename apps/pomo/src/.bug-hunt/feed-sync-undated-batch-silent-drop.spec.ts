/** @vitest-environment jsdom */
import {
  CONNECTION,
  createRepository,
  createRss,
  createSettingsResolver,
} from '../features/focus-room-feed/__tests__/feed-sync.fixture'

import {expect, it, vi} from 'vitest'

import {synchronizeFeeds} from '../features/focus-room-feed/feed-sync'

const createUndatedFeedXml = (itemIds: ReadonlyArray<string>) => {
  const entries = itemIds
    .map(
      (itemId) =>
        `<item><title>${itemId}</title><guid>${itemId}</guid><link>https://example.com/${itemId}</link><content:encoded>${itemId} 본문</content:encoded></item>`,
    )
    .join('')

  return `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>발행일 없는 피드</title>${entries}</channel></rss>`
}

it('should queue every new undated item after bootstrap even when more than the per-sync limit arrive at once', async () => {
  const {jobs, repository} = createRepository()
  let nextId = 0
  const undatedIds = Array.from({length: 25}, (_, index) => `undated-${index}`)
  const undatedFeed = new Response(createUndatedFeedXml(undatedIds))
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(createRss([{id: 'bootstrap-anchor', minute: '05'}])),
    )
    .mockResolvedValue(undatedFeed)
  const options = {
    connections: [CONNECTION],
    createId: () => {
      nextId += 1
      return `job-${nextId}`
    },
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  }

  await synchronizeFeeds(options)
  await synchronizeFeeds(options)

  expect(jobs.map((job) => job.feedItemId)).toEqual(['bootstrap-anchor', ...undatedIds])
})
