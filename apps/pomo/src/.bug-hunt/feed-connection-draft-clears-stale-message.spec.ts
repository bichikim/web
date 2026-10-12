import {render} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createRepository: vi.fn()}))

vi.mock('../features/focus-room-feed/repository', () => ({
  createFeedConnectionRepository: mocks.createRepository,
}))

import {
  type FeedConnectionController,
  useFeedConnections,
} from '../features/focus-room-feed/use-feed-connections'

const mountController = () => {
  let controller!: FeedConnectionController
  const result = render(() => {
    controller = useFeedConnections()
    return document.createElement('span')
  })
  return {controller, unmount: result.unmount}
}

beforeEach(() => {
  mocks.createRepository.mockReturnValue({list: () => [], save: vi.fn()})
})

afterEach(() => {
  vi.restoreAllMocks()
})

it('should clear a feed URL validation message when the draft URL changes', () => {
  const {controller, unmount} = mountController()

  controller.onDraftUrlChange('not-a-url')
  controller.onAdd()
  expect(controller.message()).not.toBeNull()

  controller.onDraftUrlChange('https://example.test/feed.xml')

  expect(controller.message()).toBeNull()
  unmount()
})
