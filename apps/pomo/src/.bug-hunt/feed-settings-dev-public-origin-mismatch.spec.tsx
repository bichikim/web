/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getFeedRequestUrl} from '../features/focus-room-feed/feed-request-url'

const HISTORY_PATH = '/api/feeds/today-in-history/rss.xml'
const STORED_PUBLIC_URL = 'https://www.pomofi.io/api/feeds/today-in-history/rss.xml'

it('should treat a saved public today-in-history URL as the same feed as the dev recommendation URL', () => {
  const localOrigin = 'http://127.0.0.1:4173'
  const vitePublicOrigin = 'https://www.pomofi.io'
  const timeZone = 'Asia/Seoul'

  const contentFeedUrlEnvironment = {localOrigin, publicOrigin: localOrigin, timeZone}
  const connectionFeedUrlEnvironment = {localOrigin, publicOrigin: vitePublicOrigin, timeZone}

  const recommendationUrl = getFeedRequestUrl(HISTORY_PATH, {
    publicOrigin: localOrigin,
    timeZone,
  })
  const storedRequestUrl = getFeedRequestUrl(STORED_PUBLIC_URL, connectionFeedUrlEnvironment)

  const hiddenRecommendationUrls = new Set([
    getFeedRequestUrl(STORED_PUBLIC_URL, contentFeedUrlEnvironment),
  ])

  expect(hiddenRecommendationUrls.has(recommendationUrl)).toBe(true)
})

it('should detect duplicate when adding the dev recommendation after saving the public today-in-history URL', () => {
  const localOrigin = 'http://127.0.0.1:4173'
  const vitePublicOrigin = 'https://www.pomofi.io'
  const timeZone = 'Asia/Seoul'
  const connectionFeedUrlEnvironment = {localOrigin, publicOrigin: vitePublicOrigin, timeZone}

  const recommendationUrl = getFeedRequestUrl(HISTORY_PATH, {
    publicOrigin: localOrigin,
    timeZone,
  })
  const storedRequestUrl = getFeedRequestUrl(STORED_PUBLIC_URL, connectionFeedUrlEnvironment)

  expect(getFeedRequestUrl(recommendationUrl, connectionFeedUrlEnvironment)).toBe(storedRequestUrl)
})
