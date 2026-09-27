/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should not store a rolled-over publishedAt for an impossible Atom updated date', () => {
  const feed = parseFeedXml(
    `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>날짜 롤오버</title>
        <entry>
          <title>항목</title>
          <id>rollover-1</id>
          <updated>2026-02-30T00:00:00Z</updated>
          <content>본문</content>
        </entry>
      </feed>`,
    'https://example.com/atom.xml',
  )

  expect(feed.items[0]?.publishedAt).toBeNull()
})
