/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getFeedRequestUrl} from '../features/focus-room-feed/feed-request-url'

const environment = {
  localOrigin: 'https://app.example',
  publicOrigin: 'https://www.pomofi.io',
  timeZone: 'Asia/Seoul',
}

it('should append the viewer time zone to owned today-in-history feeds with a trailing slash', () => {
  const result = getFeedRequestUrl(
    'https://www.pomofi.io/api/feeds/today-in-history/rss.xml/',
    environment,
  )

  expect(result).not.toBe('https://www.pomofi.io/api/feeds/today-in-history/rss.xml/')
  expect(new URL(result).searchParams.get('timeZone')).toBe('Asia/Seoul')
})
