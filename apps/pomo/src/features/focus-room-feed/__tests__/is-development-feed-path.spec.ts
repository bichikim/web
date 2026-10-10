import {expect, it} from 'vitest'

import {isDevelopmentFeedPath} from '../is-development-feed-path'

it.each(['/__dev/feeds/rss.xml', '/__dev/feeds/atom.xml'])(
  'should recognize the exact development-feed pathname %s',
  (pathname) => {
    expect(isDevelopmentFeedPath(pathname)).toBe(true)
  },
)

it.each([
  '',
  '/__dev/feeds/RSS.XML',
  '/__DEV/feeds/rss.xml',
  '/__dev/feeds/rss.xml/',
  '/__dev/feeds/rss.xml//',
  '/__dev/feeds/rss.xml?timeZone=Asia/Seoul',
  '/__dev/feeds/rss.xml#fragment',
  '/__dev/feeds/%72ss.xml',
  '/__dev/feeds/rss.xml.bak',
  'https://example.test/__dev/feeds/rss.xml',
  '/api/feeds/today-in-history/rss.xml',
])('should leave normalization and URL parsing to its caller for %s', (pathname) => {
  expect(isDevelopmentFeedPath(pathname)).toBe(false)
})
