/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createRepository: vi.fn()}))

vi.mock('../features/focus-room-feed/repository', () => ({
  createFeedConnectionRepository: mocks.createRepository,
}))

import {useFeedConnections} from '../features/focus-room-feed/use-feed-connections'
import {getFeedRequestUrl} from '../features/focus-room-feed/feed-request-url'

const mountController = () => {
  let controller!: ReturnType<typeof useFeedConnections>
  const result = render(() => {
    controller = useFeedConnections()
    return document.createElement('span')
  })
  return {controller, unmount: result.unmount}
}

beforeEach(() => {
  let id = 0
  vi.stubGlobal('crypto', {randomUUID: vi.fn(() => `feed-id-${(id += 1)}`)})
  mocks.createRepository.mockReturnValue({list: () => [], save: vi.fn()})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

/**
 * Bug: duplicate feed detection compares raw stored href strings, so the same
 * today-in-history feed can be saved twice when only the timeZone query differs.
 *
 * Fetch time rewrites timeZone via getFeedRequestUrl, so both subscriptions hit
 * the same effective feed.
 */
it('should reject adding the same today-in-history feed with a different timeZone query', () => {
  const publicOrigin = 'https://www.pomofi.io'
  const timeZone = 'America/New_York'
  const baseUrl = `${publicOrigin}/api/feeds/today-in-history/rss.xml`
  const withTimeZone = getFeedRequestUrl(baseUrl, {publicOrigin, timeZone})

  const {controller, unmount} = mountController()

  expect(controller.onAddRecommendation(withTimeZone)).toBe(true)
  expect(controller.connections()).toHaveLength(1)

  controller.onDraftUrlChange(baseUrl)
  controller.onAdd()

  expect(controller.connections()).toHaveLength(1)
  expect(controller.message()).toContain('이미')
  unmount()
})
