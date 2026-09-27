/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should treat rel=alternate case-insensitively when selecting permalinks', () => {
  const feed = parseFeedXml(
    `<feed><title>Atom</title><entry><title>항목</title>
      <link rel="ALTERNATE" href="https://example.com/article" />
    </entry></feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/article')
})
