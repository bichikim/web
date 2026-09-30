/** @vitest-environment jsdom */

import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should reject RSS pubDate values with an impossible calendar day', () => {
  const feed = parseFeedXml(
    `<rss version="2.0"><channel><title>테스트 RSS</title><item>
      <title>잘못된 날짜</title>
      <pubDate>Wed, 30 Feb 2026 00:00:00 GMT</pubDate>
      <link>https://example.com/item</link>
    </item></channel></rss>`,
    'https://example.com/rss.xml',
  )

  expect(feed.items[0]?.publishedAt).toBeNull()
})
