/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should resolve an Atom entry permalink when only rel=self link is present', () => {
  const feed = parseFeedXml(
    `<feed xmlns="http://www.w3.org/2005/Atom">
      <title>Atom</title>
      <entry>
        <title>Entry</title>
        <id>entry-1</id>
        <link rel="self" href="https://example.com/articles/entry-1"/>
      </entry>
    </feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.link).toBe('https://example.com/articles/entry-1')
})
