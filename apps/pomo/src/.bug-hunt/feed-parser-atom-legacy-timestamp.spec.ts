/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should parse Atom created when published and updated are absent', () => {
  const feed = parseFeedXml(
    `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry>
      <title>항목</title><id>atom-created</id>
      <created>2026-08-14T01:00:00Z</created>
    </entry></feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.publishedAt).toBe('2026-08-14T01:00:00.000Z')
})

it('should parse Atom issued when published and updated are absent', () => {
  const feed = parseFeedXml(
    `<feed xmlns="http://www.w3.org/2005/Atom"><title>Atom</title><entry>
      <title>항목</title><id>atom-issued</id>
      <issued>2026-08-14T01:00:00Z</issued>
    </entry></feed>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items[0]?.publishedAt).toBe('2026-08-14T01:00:00.000Z')
})
