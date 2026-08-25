import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

const feedMocks = vi.hoisted(() => ({handlePublicFeed: vi.fn()}))

vi.mock('src/server/feed-publisher/handle-public-feed', () => feedMocks)

import {GET, HEAD} from '../atom.xml'

beforeEach(() => {
  vi.clearAllMocks()
})

it.each([
  ['GET', GET],
  ['HEAD', HEAD],
])('should delegate %s requests as Atom feeds', async (_method, handler) => {
  const event = {
    params: {slug: 'history'},
    request: new Request('https://pomo.example/feed'),
  } as unknown as APIEvent
  const response = new Response('<feed />')
  feedMocks.handlePublicFeed.mockResolvedValue(response)

  await expect(handler(event)).resolves.toBe(response)
  expect(feedMocks.handlePublicFeed).toHaveBeenCalledWith(event, 'atom')
})
