/** @vitest-environment jsdom */
import {expect, it, vi} from 'vitest'

import {CONNECTION, createRepository, createSettingsResolver} from '../features/focus-room-feed/__tests__/feed-sync.fixture'
import {synchronizeFeeds} from '../features/focus-room-feed/feed-sync'

it('should reject a feed item URL that only adds a query string to the feed document', async () => {
  const {items, jobs, repository} = createRepository()
  const fetcher = vi.fn(
    async () =>
      new Response(`<rss><channel><title>Pomo 테스트</title><item>
        <title>안녕하세요</title><guid>self-link-query</guid>
        <link>https://example.com/feed.xml?source=rss</link>
        <pubDate>Fri, 14 Aug 2026 00:05:00 GMT</pubDate>
        <description>안녕하세요</description></item></channel></rss>`),
  )

  await synchronizeFeeds({
    connections: [CONNECTION],
    createId: () => 'unused',
    fetcher,
    now: new Date('2026-08-14T00:06:00.000Z'),
    repository,
    resolveGenerationSettings: createSettingsResolver(),
  })

  expect(fetcher).toHaveBeenCalledOnce()
  expect(jobs).toHaveLength(0)
  expect(items[0]).toMatchObject({
    message: '피드 항목이 원문 대신 피드 자체 주소를 가리키고 있어요.',
    status: 'failed',
  })
})
