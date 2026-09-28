/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should resolve an Atom entry link when only rel=self is present', () => {
  const feed = parseFeedXml(
    `<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Atom</title>
        <entry>
          <title>기사</title>
          <link rel="self" href="https://example.com/articles/only-self" />
        </entry>
      </feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/articles/only-self')
})

it('should resolve an RSS item link when only rel=self is present', () => {
  const feed = parseFeedXml(
    `<rss version="2.0">
      <channel>
        <title>RSS</title>
        <item>
          <title>기사</title>
          <link rel="self" href="https://example.com/articles/rss-self" />
        </item>
      </channel>
    </rss>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/articles/rss-self')
})
