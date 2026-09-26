/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {parseFeedXml} from '../features/focus-room-feed/feed-parser'

it('should not throw when the feed title is missing and the feed URL is invalid', () => {
  expect(() =>
    parseFeedXml(`<rss><channel><item><title>항목</title></item></channel></rss>`, 'not-a-url'),
  ).not.toThrow()
})
