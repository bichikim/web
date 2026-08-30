import {expect, it, vi} from 'vitest'

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
