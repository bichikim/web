/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('../historical-moments-source', () => ({
  historicalMomentsSource: {listPublished: vi.fn()},
}))

import {createPublicFeedRegistry} from '../public-feed-registry'

const REQUEST = new Request('http://localhost:3000/api/feeds/today-in-history/rss.xml')

it('should create the historical moments registry for the request origin', () => {
  const registry = createPublicFeedRegistry(REQUEST)

  expect(registry.listProviders()).toHaveLength(1)
  expect(registry.listProviders()[0]?.definition.slug).toBe('today-in-history')
})

import {historicalMomentsSource} from '../historical-moments-source'
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})
it.each([
  ['', 31, 12],
  ['?timeZone=America%2FLos_Angeles', 31, 12],
  ['?timeZone=Pacific%2FKiritimati', 1, 1],
])(
  'should select the request calendar date independently of the server zone: %s',
  async (query, day, month) => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-12-31T18:00:00Z'))
    vi.mocked(historicalMomentsSource.listPublished).mockResolvedValue([])
    const registry = createPublicFeedRegistry(new Request(`${REQUEST.url}${query}`))
    await registry.listProviders()[0].listEntries()
    expect(historicalMomentsSource.listPublished).toHaveBeenCalledWith({day, limit: 50, month})
  },
)
