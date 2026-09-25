/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should prefer published over an earlier updated timestamp', () => {
  const feed = parseFeedXml(
    `<feed xmlns="http://www.w3.org/2005/Atom"><title>T</title><entry>
       <title>B</title><id>b</id><link href="https://example.com/b"/>
       <updated>2026-09-20T00:00:00Z</updated><published>2024-01-01T00:00:00Z</published>
     </entry></feed>`,
    'https://example.com/atom.xml',
  )

  expect(feed.items[0]?.publishedAt).toBe('2024-01-01T00:00:00.000Z')
})
