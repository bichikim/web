/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should assign distinct fallback ids when link and published date are missing', () => {
  const feed = parseFeedXml(
    `<rss><channel>` +
      `<item><title>제목 없는 피드</title></item>` +
      `<item><title>제목 없는 피드</title></item>` +
      `</channel></rss>`,
    'https://example.com/feed.xml',
  )

  expect(feed.items).toHaveLength(2)
  expect(new Set(feed.items.map((item) => item.id)).size).toBe(2)
})
