/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from 'src/features/focus-room-feed/feed-parser'

const createDatedTitleOnlyFeedXml = (descriptions: ReadonlyArray<string>) => {
  const entries = descriptions
    .map(
      (description) =>
        `<item>
        <title>공지</title>
        <pubDate>Fri, 14 Aug 2026 00:00:00 GMT</pubDate>
        <description>${description}</description>
      </item>`,
    )
    .join('')

  return `<rss version="2.0"><channel><title>Probe</title>${entries}</channel></rss>`
}

it('should assign distinct ids to dated RSS items that share a title but have no guid or link', () => {
  const feed = parseFeedXml(
    createDatedTitleOnlyFeedXml(['첫 번째 본문', '두 번째 본문']),
    'https://example.com/feed.xml',
  )

  expect(feed.items).toHaveLength(2)
  expect(feed.items[0]?.id).not.toBe(feed.items[1]?.id)
})
