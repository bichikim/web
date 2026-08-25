import {render} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  events: {},
  feeds: {},
  useEvents: vi.fn(),
  useFeeds: vi.fn(),
}))

vi.mock('../../focus-room-dialogue', () => ({usePEvents: mocks.useEvents}))
vi.mock('../use-focus-room-feeds', () => ({usePFeeds: mocks.useFeeds}))

import {PFeedProvider, useOptionalPFeeds, usePFeedContext} from '../PFeedContext'

it('should provide the feed controller created from dialogue events', () => {
  mocks.useEvents.mockReturnValue(mocks.events)
  mocks.useFeeds.mockReturnValue(mocks.feeds)
  let optional: unknown
  let required: unknown
  const Consumer = () => {
    optional = useOptionalPFeeds()
    required = usePFeedContext()
    return <span>child</span>
  }

  render(() => (
    <PFeedProvider>
      <Consumer />
    </PFeedProvider>
  ))

  expect(mocks.useFeeds).toHaveBeenCalledWith({events: mocks.events})
  expect(optional).toBe(mocks.feeds)
  expect(required).toBe(mocks.feeds)
})

it('should expose an empty optional context and reject a missing required context', () => {
  expect(useOptionalPFeeds()).toBeUndefined()
  expect(() => usePFeedContext()).toThrow('usePFeedContext must be used inside PFeedProvider.')
})
