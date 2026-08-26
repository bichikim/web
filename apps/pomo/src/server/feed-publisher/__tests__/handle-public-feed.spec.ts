import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

const feedMocks = vi.hoisted(() => ({
  createFeedResponse: vi.fn(),
  createPublicFeedRegistry: vi.fn(),
}))

vi.mock('src/features/feed-publisher', () => ({createFeedResponse: feedMocks.createFeedResponse}))
vi.mock('../public-feed-registry', () => ({
  createPublicFeedRegistry: feedMocks.createPublicFeedRegistry,
}))

import {handlePublicFeed} from '../handle-public-feed'

beforeEach(() => {
  vi.clearAllMocks()
})

it('should create a public registry and delegate the requested feed format', async () => {
  const request = new Request('https://pomo.example/api/feeds/history/rss.xml')
  const registry = {get: vi.fn()}
  const response = new Response('<rss />')
  feedMocks.createPublicFeedRegistry.mockReturnValue(registry)
  feedMocks.createFeedResponse.mockResolvedValue(response)

  await expect(
    handlePublicFeed({params: {slug: 'history'}, request} as unknown as APIEvent, 'rss'),
  ).resolves.toBe(response)
  expect(feedMocks.createPublicFeedRegistry).toHaveBeenCalledWith(request)
  expect(feedMocks.createFeedResponse).toHaveBeenCalledWith({
    format: 'rss',
    registry,
    request,
    slug: 'history',
  })
})
