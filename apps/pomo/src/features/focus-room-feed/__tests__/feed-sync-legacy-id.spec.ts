/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

import {CONNECTION, createRepository, createSettingsResolver} from './feed-sync.fixture'
import {synchronizeFeeds} from '../feed-sync'

it('should deduplicate one dated fallback item and process its colliding sibling', async () => {
  const {items, jobs, repository} = createRepository()
  const legacyId = '같은 제목\u00002026-08-14T00:05:00.000Z'
  items.push({
    contentLength: 10,
    discoveredAt: '2026-08-14T00:05:00.000Z',
    feedConnectionId: CONNECTION.id,
    feedItemId: legacyId,
    id: `${CONNECTION.id}\u0000${legacyId}`,
    itemTitle: '같은 제목',
    message: null,
    publishedAt: '2026-08-14T00:05:00.000Z',
    sourceTitle: '발행일 없는 피드',
    sourceUrl: CONNECTION.url,
    status: 'ready',
    updatedAt: '2026-08-14T00:05:00.000Z',
    version: 1,
  })
  const xml = `<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>발행일 없는 피드</title>
    <item><title>같은 제목</title><pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
      <content:encoded>기존 본문</content:encoded></item>
    <item><title>같은 제목</title><pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
      <content:encoded>새 본문</content:encoded></item>
  </channel></rss>`

  const summary = await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'job-1',
    fetcher: vi.fn(async () => new Response(xml)),
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(summary.queuedJobIds).toEqual(['job-1'])
  expect(jobs).toHaveLength(1)
  expect(jobs[0]?.feedItemId).not.toBe(legacyId)
  expect(items).toHaveLength(2)
  expect(items.map((item) => item.feedItemId)).toContain(legacyId)
  expect(new Set(items.map((item) => item.feedItemId)).size).toBe(2)
})
