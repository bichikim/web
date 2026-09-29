/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getFeedRequestUrl} from '../features/focus-room-feed/feed-request-url'

const environment = {
  localOrigin: 'https://app.example',
  publicOrigin: 'https://www.pomofi.io',
  timeZone: 'Asia/Seoul',
}

it('should apply viewer time zone when today-in-history feed path uses uppercase rss', () => {
  const url = new URL(
    getFeedRequestUrl('/api/feeds/today-in-history/RSS.xml', environment),
    'https://www.pomofi.io',
  )

  expect(url.searchParams.get('timeZone')).toBe('Asia/Seoul')
})
