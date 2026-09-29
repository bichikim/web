/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getFeedRequestUrl} from '../features/focus-room-feed/feed-request-url'

it('should apply viewer time zone when dev feed path uses uppercase atom', () => {
  const url = new URL(
    getFeedRequestUrl('/__dev/feeds/ATOM.xml', {
      localOrigin: 'https://app.example',
      publicOrigin: 'https://www.pomofi.io',
      timeZone: 'UTC',
    }),
    'https://app.example',
  )

  expect(url.searchParams.get('timeZone')).toBe('UTC')
})
