/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from 'src/features/focus-room-feed/feed-parser'

it('should reject an RSS pubDate with an overflow ISO hour', () => {
  const feed = parseFeedXml(
    `<rss><channel><item><pubDate>2026-08-14T24:00:00Z</pubDate></item></channel></rss>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.publishedAt).toBeNull()
})
