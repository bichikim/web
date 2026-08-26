/** @vitest-environment jsdom */

import {render} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import type {PFeedController} from '../feed-controller'
import {PFeedContext, useOptionalPFeeds, usePFeedContext} from '../feed-context'

it('should expose an optional empty feed context outside its provider', () => {
  expect(useOptionalPFeeds()).toBeUndefined()
})

it('should require the feed provider for the strict context hook', () => {
  expect(() => usePFeedContext()).toThrow('usePFeedContext must be used inside PFeedProvider.')
})

it('should return the feed controller supplied by the provider', () => {
  const controller = {} as PFeedController
  let observedController: PFeedController | undefined
  const Consumer = () => {
    observedController = usePFeedContext()
    return null
  }

  render(() => (
    <PFeedContext.Provider value={controller}>
      <Consumer />
    </PFeedContext.Provider>
  ))

  expect(observedController).toBe(controller)
})
