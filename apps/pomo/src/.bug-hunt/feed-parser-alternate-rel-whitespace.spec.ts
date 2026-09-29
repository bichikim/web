/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should resolve an alternate Atom link when rel is padded with whitespace', () => {
  const feed = parseFeedXml(
    `<feed><title>Atom</title><entry>
      <link rel=" alternate " href="https://example.com/article" />
    </entry></feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/article')
})

it('should resolve an alternate Atom link when rel contains tab characters', () => {
  const feed = parseFeedXml(
    `<feed><entry><link rel="\talternate\t" href="https://example.com/article" /></entry></feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/article')
})
