/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('../server/feed-publisher/historical-moments-source', () => ({
  historicalMomentsSource: {listPublished: vi.fn()},
}))

import {historicalMomentsSource} from '../server/feed-publisher/historical-moments-source'
import {createPublicFeedRegistry} from '../server/feed-publisher/public-feed-registry'

const RECOMMENDED_PATH = '/api/feeds/today-in-history/rss.xml'

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

it('should serve the viewer-local calendar day through the recommended subscription URL', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-14T20:00:00.000Z'))
  vi.mocked(historicalMomentsSource.listPublished).mockResolvedValue([])

  const recommendedUrl = new URL(RECOMMENDED_PATH, 'http://localhost:3000')
  const registry = createPublicFeedRegistry(new Request(recommendedUrl))
  await registry.listProviders()[0]?.listEntries()

  expect(historicalMomentsSource.listPublished).toHaveBeenCalledWith({day: 15, limit: 50, month: 8})
})

it('should append the viewer timezone to the recommended feed subscription URL', () => {
  const recommendedUrl = new URL(RECOMMENDED_PATH, 'http://localhost:3000')

  expect(recommendedUrl.searchParams.get('timeZone')).toBe('Asia/Seoul')
})
