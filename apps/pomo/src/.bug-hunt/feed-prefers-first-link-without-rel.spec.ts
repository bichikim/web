/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should prefer rel=alternate over a preceding link without rel', () => {
  const feed = parseFeedXml(
    `<rss><channel><title>피드</title><item><title>항목</title>
      <link>https://example.com/comments</link>
      <link rel="alternate" href="https://example.com/article" />
    </item></channel></rss>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/article')
})
