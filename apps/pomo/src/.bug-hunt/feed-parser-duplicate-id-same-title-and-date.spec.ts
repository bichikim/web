/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should keep linkless items with the same title and publication time distinct', () => {
  const feed = parseFeedXml(
    `<rss version="2.0">
      <channel>
        <title>피드</title>
        <item>
          <title>같은 제목</title>
          <pubDate>Fri, 14 Aug 2026 00:00:00 GMT</pubDate>
          <description>첫 번째 본문</description>
        </item>
        <item>
          <title>같은 제목</title>
          <pubDate>Fri, 14 Aug 2026 00:00:00 GMT</pubDate>
          <description>두 번째 본문</description>
        </item>
      </channel>
    </rss>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items).toHaveLength(2)
  expect(new Set(feed.items.map((item) => item.id)).size).toBe(2)
})
