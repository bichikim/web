/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getFeedRequestUrl} from '../features/focus-room-feed/feed-request-url'

const environment = {
  localOrigin: 'https://app.example',
  publicOrigin: 'https://www.pomofi.io',
  timeZone: 'Asia/Seoul',
}

it('should append viewer timeZone when today-in-history feed path has a trailing slash', () => {
  const url = new URL(
    getFeedRequestUrl('https://www.pomofi.io/api/feeds/today-in-history/rss.xml/', environment),
  )

  expect(url.searchParams.get('timeZone')).toBe('Asia/Seoul')
})

it('should append viewer timeZone when dev feed path has a trailing slash', () => {
  const url = new URL(
    getFeedRequestUrl('https://app.example/__dev/feeds/rss.xml/', {
      ...environment,
      localOrigin: 'https://app.example',
    }),
  )

  expect(url.searchParams.get('timeZone')).toBe('Asia/Seoul')
})
