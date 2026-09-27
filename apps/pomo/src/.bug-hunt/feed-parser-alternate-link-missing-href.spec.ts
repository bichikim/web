/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should use a later alternate Atom link when an earlier alternate link has no href', () => {
  const feed = parseFeedXml(
    `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry>
      <title>항목</title>
      <link rel="alternate" type="text/html" />
      <link rel="alternate" href="https://example.com/article" />
    </entry></feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/article')
})

it('should use a later RSS link when the first alternate link cannot be resolved', () => {
  const feed = parseFeedXml(
    `<rss><channel><title>RSS</title><item>
      <title>항목</title>
      <link rel="alternate"></link>
      <link>https://example.com/story</link>
    </item></channel></rss>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/story')
})

it('should use a later alternate link when the first alternate href is only whitespace', () => {
  const feed = parseFeedXml(
    `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry>
      <link rel="alternate" href="   " />
      <link rel="alternate" href="https://example.com/article" />
    </entry></feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/article')
})
