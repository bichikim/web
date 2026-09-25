/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should not treat nested RSS item elements as top-level feed entries', () => {
  const feed = parseFeedXml(
    `<?xml version="1.0"?>
      <rss version="2.0"><channel><title>중첩 item</title>
        <item>
          <title>바깥 항목</title><guid>outer</guid>
          <item><title>안쪽 항목</title><guid>inner</guid></item>
        </item>
      </channel></rss>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items).toEqual([
    {
      content: '',
      contentKind: 'none',
      id: 'outer',
      link: '',
      publishedAt: null,
      title: '바깥 항목',
    },
  ])
})
