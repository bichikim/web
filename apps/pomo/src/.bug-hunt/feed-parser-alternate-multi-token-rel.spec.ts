/** @vitest-environment jsdom */

import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should accept alternate when rel includes additional tokens', () => {
  const feed = parseFeedXml(
    `<feed><title>Atom</title><entry>
      <link rel="alternate noopener" href="https://example.com/article" />
    </entry></feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/article')
})
