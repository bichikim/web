/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

import {createDelegatedEvent} from '../delegated-event'
import {delegatedFocusEmit, delegatedFocusOn} from '../focus-event'

describe('delegated focus events', () => {
  it('should deliver focus state for a deep position', () => {
    const {delegatedEventMap, unsubscribe} = createDelegatedEvent()
    const listener = vi.fn()
    const registration = delegatedFocusOn(delegatedEventMap, [{x: 1, y: 2}], listener)
    registration.addListener()

    delegatedFocusEmit([{x: 1, y: 2}], true, {reason: 'keyboard'})

    expect(listener).toHaveBeenCalledWith(true, undefined)
    registration.removeListener()
    unsubscribe()
  })
})
