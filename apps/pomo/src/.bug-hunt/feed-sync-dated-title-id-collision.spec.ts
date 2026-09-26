/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {CONNECTION, createRepository, createSettingsResolver} from 'src/features/focus-room-feed/__tests__/feed-sync.fixture'
import {synchronizeFeeds} from 'src/features/focus-room-feed/feed-sync'

const createDatedTitleOnlyFeedXml = (descriptions: ReadonlyArray<string>) => {
  const entries = descriptions
    .map(
      (description) =>
        `<item>
        <title>공지</title>
        <pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
        <content:encoded>${description}</content:encoded>
      </item>`,
    )
    .join('')

  return `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Probe</title>${entries}</channel></rss>`
}

it('should queue separate jobs when a feed adds a second dated item with the same title and no link', async () => {
  const {items, jobs, repository} = createRepository()
  let nextId = 0
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(new Response(createDatedTitleOnlyFeedXml(['첫 번째 본문'])))
    .mockResolvedValueOnce(
      new Response(createDatedTitleOnlyFeedXml(['첫 번째 본문', '두 번째 본문'])),
    )
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

  const firstSummary = await synchronizeFeeds(options)
  const firstFeedItemId = jobs[0]?.feedItemId

  expect(firstSummary.queuedJobIds).toEqual(['job-1'])
  expect(firstFeedItemId).toBeDefined()

  const secondSummary = await synchronizeFeeds(options)

  expect(secondSummary.queuedJobIds).toEqual(['job-2'])
  expect(jobs).toHaveLength(2)
  expect(new Set(jobs.map((job) => job.feedItemId)).size).toBe(2)
  expect(new Set(items.map((item) => item.feedItemId)).size).toBe(2)
})
